/** eslint-disable  func-names */
/** eslint-disable  dot-notation */
/** eslint-disable  new-cap */
/** eslint quote-props: ['error', 'consistent']*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports en-US lauguage.
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-trivia
 **/

'use strict';

const Alexa = require('alexa-sdk');
const questions = require('./questionnaire');

const ANSWER_COUNT = 4; // The number of possible answers per trivia question.
let GAME_LENGTH = 3;  // The number of questions per trivia game.
let PLAYER_MAX_COUNT = 5;
let TOPIC_MAX_COUNT = 4;
let PLAYER_COUNT = 0;
let TOPIC_INDEX = 0;
let STOP_COUNT = 0;
let PLAYER_SCORES = [];
let PLAYER_ALIAS = [];
let INVALID_COUNT = -1; // This can overflow (fix this)****
const GAME_STATES = {
    TRIVIA: '_TRIVIAMODE', // Asking trivia questions.
    START: '_STARTMODE', // Entry point, start the game.
    HELP: '_HELPMODE', // The user is asking for help.
};
const APP_ID = undefined;//"amzn1.ask.skill.06171baf-f8b0-462f-bb22-2426ed6114bb"; // TODO replace with your app ID (OPTIONAL)

/**
 * When editing your questions pay attention to your punctuation. Make sure you use question marks or periods.
 * Make sure the first answer is the correct one. Set at least ANSWER_COUNT answers, any extras will be shuffled in.
 */
const languageString = {
    'en': {
        'translation': {
            'TOPICS': ['Friends TV Show ', 'History ', 'General Knowledge ', 'Simple Questions ' ],
            'TOPICONE': questions['TOPIC_ONE'],
            'TOPICTWO': questions['TOPIC_TWO'],
            'TOPICTHREE': questions['TOPIC_THREE'],
            'TOPICFOUR': questions['TOPIC_FOUR'],
			'PLAYER_NAMES': questions['PLAYER_NAMES'],
            'GAME_NAME': 'Quiz It Up - The Trivia Game', // Be sure to change this for your skill.
            'HELP_MESSAGE': 'I will ask you %s multiple choice questions. Respond with the number of the answer. ' +
                'To start a new game at any time, say, start game. You can always ask me to repeat ,or score ,or help, or stop. ',
            'HELP_MESSAGE_MULTI': 'I will ask you %s multiple choice questions each. Respond with the number of the answer. ' +
                'To start a new game at any time, say, start game. You can always ask me to repeat ,or score ,or help, or stop. ',
            'HINT': 'Sorry i don\'t support that now.<break time="1s"/> Back to the game!',
            'REPEAT_QUESTION_MESSAGE': 'To repeat the last question, say, repeat. ',
            'ASK_MESSAGE_START': 'Would you like to start playing?',
            'HELP_REPROMPT': 'To give an answer to a question, respond with the number of the answer. ',
            'STOP_MESSAGE': 'Would you like to keep playing?',
            'CANCEL_MESSAGE': 'Ok, let\'s play again soon.',
            'NO_MESSAGE': 'Ok, we\'ll play another time. Goodbye!',
            'TRIVIA_UNHANDLED': 'Try saying a number between 1 and %s ',
            'HELP_UNHANDLED': 'Say yes to continue, or no to end the game.',
            'START_UNHANDLED': 'Say start to start a new game.',
            'NEW_GAME_MESSAGE': 'Welcome to %s, Let\'s get started, ask me for help anytime. ',
            'WELCOME_MESSAGE': 'I will ask you %s questions, try to get as many right as you can. ' +
            'you can just say the number of the answer. ',
            'RESTART_NEW_MESSAGE': 'Alright starting new game, just ask me for help anytime.  ',
            'ANSWER_CORRECT_MESSAGE': 'correct. ',
            'ANSWER_WRONG_MESSAGE': 'wrong. ',
            'CORRECT_ANSWER_MESSAGE': 'The correct answer is %s: %s. ',
            'ANSWER_IS_MESSAGE': 'That answer is ',
            'TELL_QUESTION_MESSAGE': 'Question %s. %s ',
            'PLAYER_QUESTION_MESSAGE': '%s, Question %s. %s ',
            'GAME_OVER_MESSAGE': 'You got %s out of %s questions correct. Thank you for playing!',
            'SCORE_IS_MESSAGE': 'Your score is %s. ',
            'SET_PLAYER_MESSAGES': [' Got any Friends to play along? ', ' Got Friends with you to compete? ', ' Competing with someone? '],
            'SET_PLAYER_MESSAGE': 'I can take up to five players. How many players do you have?',
            'RESET_PLAYER_MESSAGE': 'Sure resetting players, ',
            'CHANGE_PLAYER_COUNT': 'Do you want to change player count? ',
            'PLAYER_COUNT_IS_MESSAGE': ' Done, %s players and Topic: %s . <break time="1s"/>',
            'SINGLE_PLAYER_GAME': 'Going solo on %s <break time="1s"/> ',
            'BEGIN_GAME': [' Off to the game now. ', 'Let\'s begin. It\'s gonna get rough. ', 'Get Ready, i\'ve some good questions coming up. '],
            'WIN_ANNOUNCE': 'And the winner is %s with a score of %s! !! ',
            'TIE_ANNOUNCE': 'Oh, no! it\'s a tie!! I don\'t have a tie breaker yet in this version. ',
            'SAY_PLAYER_NAME': ' Now player %s, Let me just call you %s. ',
            'ANOTHER_GAME': ' Do you want to play another game? ',
            'SCORE_GREET': [" ", ' Good Job. ', 'Wow! you\'re on fire, two in a row. ', 'Awesome! You\'ve got all three right. '],
            'PLAYER_COUNT_SELECTED': ' %s player game it is. ',
			'TOPIC_SELECTION_MESSAGE': ' Pick one of the topics: FRIENDS TV Show, History, General Knowledge, Simple Questions ',
			'INVALID_ANSWER_SLOT': {'all': ['Sorry I didn\'t get you, Let me repeat the question. <break time="1s"/> ',
			                                 'Sorry again, i\'m not quite sure i got that. ',
			                                 'Just say Alexa Help, if you need some help'], 
			                        'novalidans':  ['Sorry i didn\'t quite get that, looks like it\'s a tricky one! Try the number of answer instead of the answer! ', 
			                                        'Sorry i\'m a bit slow, let me just get the option for this question again! <break time="0.5s"/>',
			                                        'Just say Alexa Help, if you need some help'],
			                        'novalidtopic': ['You can even say one through four for options than the name! The question again. ',
			                                         'Try saying Friends <break time="0.5s"/> or Simple Questions. ',
			                                         'Just say Alexa Help, if you need some help'],
			                        'noplayerset' : ['Try saying a number between 1 and 5. ', 
			                                          'You can say we\'re three players <break time="1s"/>',
			                                          'Sorry I didn\'t get you, Let me repeat the question. ',
			                                          'Looks like this\'s gonna be a long day! Let me know, if you need some help.']
			},
			//AUDIO CLIPS
            'AUDIO_NEWGAME_MESSAGE': '<audio src="https://s3.amazonaws.com/quizitup/audio_clips/drumroll.mp3"/>',
            'AUDIO_RIGHT_ANSWER': 'correct. <audio src="https://s3.amazonaws.com/quizitup/audio_clips/applause.mp3"/>',
            'AUDIO_WRONG_ANSWER': 'wrong. <audio src="https://s3.amazonaws.com/quizitup/audio_clips/boo.mp3"/> Ouch! ',
            'AUDIO_CONGRATS': 'That\'s a good game <audio src="https://s3.amazonaws.com/quizitup/audio_clips/cheer.mp3"/> Thanks for Playing. ',
        },
    }
};

const newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', true);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', true);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser', true);
    },
    'Unhandled': function () {
        const speechOutput = this.t('START_UNHANDLED');
        this.emit(':ask', speechOutput, speechOutput);
    },
};

function populateGameQuestions(translatedQuestions) {
    const gameQuestions = [];
    const indexList = [];
    let index = translatedQuestions.length;

    if (GAME_LENGTH > index) {
        throw new Error('Invalid Game Length.' + GAME_LENGTH + " > " + index);
    }

    for (let i = 0; i < translatedQuestions.length; i++) {
        indexList.push(i);
    }

    // Pick GAME_LENGTH random questions from the list to ask the user, make sure there are no repeats.
    for (let j = 0; j < GAME_LENGTH; j++) {
        const rand = Math.floor(Math.random() * index);
        index -= 1;

        const temp = indexList[index];
        indexList[index] = indexList[rand];
        indexList[rand] = temp;
        gameQuestions.push(indexList[index]);
    }
    console.log("Game Questions Length:" + gameQuestions.length);
    return gameQuestions;
}

/**
 * Get the answers for a given question, and place the correct answer at the spot marked by the
 * correctAnswerTargetLocation variable. Note that you can have as many answers as you want but
 * only ANSWER_COUNT will be selected.
 * */
function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
    const answers = [];
    console.log(gameQuestionIndexes + ", CorrectAnswerIndex " + correctAnswerIndex + ", CorrectAnswerTargetLocation" + correctAnswerTargetLocation);
    for(var i= 0; i< translatedQuestions.length;i++){
        console.log(i+ ":" + Object.keys(translatedQuestions[i]) + "" +  translatedQuestions[i][Object.keys(translatedQuestions[i])[0]]);
    }
    console.log("TRanslated:" + translatedQuestions[gameQuestionIndexes[correctAnswerIndex]]);
    console.log("Question:" + Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]);
    // console.log("translatedQuestions:" + translatedQuestions[18]['Which of the below has an IMDB rating of 9.5?']);
    console.log("GameQuestionIndex:" + gameQuestionIndexes[correctAnswerIndex]);
    let answersCopy = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]].slice();
    let index = answersCopy.length;

    if (index < ANSWER_COUNT) {
        throw new Error('Not enough answers for question. ' + answersCopy);
    }
    console.log("Answers:" + answersCopy);
    // Shuffle the answers, excluding the first element which is the correct answer.
    for (let j = 1; j < answersCopy.length; j++) {
        const rand = Math.floor(Math.random() * (index - 1)) + 1;
        index -= 1;
        console.log("index:"+ index + "swapping:" + answersCopy[index] + "," + answersCopy[rand]);
        let swapTemp1 = answersCopy[index];
        answersCopy[index] = answersCopy[rand];
        answersCopy[rand] = swapTemp1;
    }
    
    // Swap the correct answer into the target location
    for (let i = 0; i < ANSWER_COUNT; i++) {
        answers[i] = answersCopy[i];
    }
    const swapTemp2 = answers[0];
    answers[0] = answers[correctAnswerTargetLocation];
    answers[correctAnswerTargetLocation] = swapTemp2;
    return answers;
}

function isAnswerSlotValid(intent, upperLimit) {
    const answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    const answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value, 10));
    return answerSlotIsInt
        && parseInt(intent.slots.Answer.value, 10) < (upperLimit)
        && parseInt(intent.slots.Answer.value, 10) > 0;
}

function isAnswerTextSlotValid(intent){
    const answerTextSlotFilled = intent && intent.slots && intent.slots.AnswerText && intent.slots.AnswerText.value;
    return answerTextSlotFilled;
}

function randomIndex(totalNums){
    return  Math.floor(Math.random() * totalNums);
}

function shufflePlayerNames(playerNames){
    const shuffledNames = [];
    for (var a = playerNames , i = a.length; i--; ) {
        var randomName = a.splice(Math.floor(Math.random() * (i + 1)), 1)[0];
        shuffledNames.push(randomName);
    }
    return shuffledNames.slice(0, PLAYER_COUNT);
}

function initScores(){
    for(var i=0;i<PLAYER_COUNT;i++){
        PLAYER_SCORES.push(0);
    }
}

function winningPlayer(){
    var maxScore  = Math.max.apply(Math, PLAYER_SCORES);
    if (PLAYER_SCORES.indexOf(maxScore) == PLAYER_SCORES.lastIndexOf(maxScore)) {
        return PLAYER_SCORES.indexOf(maxScore);
    } else {
        return -1;
    }
}

function validTopic(topics, Answer){
    topics = ['Friends TV Show', 'History', 'General Knowledge', 'Simple Questions' ];
    for(var i= 0; i<4;i++){
        console.log(topics[i] + "<>" + Answer);
        if(topics[i].toLowerCase().includes(Answer.toLowerCase())){
            return i+1;
        }
    }
    return -1;
}

function handleUserGuess(userGaveUp) {
    const answerSlotValid = isAnswerSlotValid(this.event.request.intent, ANSWER_COUNT+1);
    let speechOutput = '';
    let speechOutputAnalysis = '';
    const gameQuestions = this.attributes.questions;
    let correctAnswerIndex = parseInt(this.attributes.correctAnswerIndex, 10);
    //let currentScore = parseInt(this.attributes.score, 10);
    let currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
    const correctAnswerText = this.attributes.correctAnswerText;
    let translatedQuestions = [];
    if (TOPIC_INDEX == 1) {
        translatedQuestions = this.t('TOPICONE');
    } else if (TOPIC_INDEX == 2) {
		translatedQuestions = this.t('TOPICTWO');
	} else if (TOPIC_INDEX == 3) {
		translatedQuestions = this.t('TOPICTHREE');
	} else if(TOPIC_INDEX == 4){
	    translatedQuestions = this.t('TOPICFOUR');
	} else{
	    this.emitWithState("AnswerIntent");
	}
    const answerTextSlotValid = isAnswerTextSlotValid(this.event.request.intent);
    //const isPartialAnswer = ;
    let playerIndex = ((PLAYER_COUNT+currentQuestionIndex)%PLAYER_COUNT);
    
    if ((answerSlotValid && parseInt(this.event.request.intent.slots.Answer.value, 10) === this.attributes['correctAnswerIndex']) || (answerTextSlotValid &&( 
    correctAnswerText.toLowerCase().includes(this.event.request.intent.slots.AnswerText.value.toLowerCase()) || this.event.request.intent.slots.AnswerText.value.toLowerCase().includes(correctAnswerText.toLowerCase())  ) )) {
        //currentScore++;
        if(answerTextSlotValid){
            console.log("CorrectAnswer:" + correctAnswerText.toLowerCase() + "<> User:" + this.event.request.intent.slots.AnswerText.value.toLowerCase());
            if(this.event.request.intent.slots.AnswerText.value.toLowerCase().includes('hint')){
                this.emitWithState('TRIVIA_UNHANDLED');
            }
        }
        PLAYER_SCORES[playerIndex] += 1;
        if(randomIndex(2) == 1){
            speechOutputAnalysis = this.t('ANSWER_CORRECT_MESSAGE') + this.t('SCORE_GREET')[PLAYER_SCORES[playerIndex]];
        }else{
            speechOutputAnalysis = this.t('AUDIO_RIGHT_ANSWER');
        }
    } else {
        if (!answerSlotValid && !answerTextSlotValid && !userGaveUp) {
            this.emitWithState('InvalidAnswerIntent', ["novalidans",0]);
        } else if (!userGaveUp) {
            if(randomIndex(3) == 1){
                speechOutputAnalysis = this.t('AUDIO_WRONG_ANSWER');
            }else{
                speechOutputAnalysis = this.t('ANSWER_WRONG_MESSAGE');
            }
        }
        speechOutputAnalysis += this.t('CORRECT_ANSWER_MESSAGE', correctAnswerIndex, correctAnswerText);
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (this.attributes['currentQuestionIndex'] === GAME_LENGTH - 1) {
        
        speechOutput = userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', PLAYER_SCORES[playerIndex].toString());
        //speechOutput += speechOutputAnalysis;
        if (PLAYER_COUNT == 1) {
            speechOutput += this.t('GAME_OVER_MESSAGE', PLAYER_SCORES[0].toString(), GAME_LENGTH.toString());
        } else {
            var winningPlayerIndex = winningPlayer();
             if (winningPlayerIndex != -1) {
                 speechOutput += this.t('WIN_ANNOUNCE', PLAYER_ALIAS[winningPlayerIndex].toString(), PLAYER_SCORES[winningPlayerIndex]);
                 speechOutput += this.t('AUDIO_CONGRATS');
             } else {
                 speechOutput += this.t('TIE_ANNOUNCE');
             }
        }
		//this.emit(':tell', speechOutput);
		let repromptText = 'Do you want to play another game ?';
		//can ask if the user wants to continue
		this.emit(':ask', speechOutput + repromptText, repromptText);
    } else {
        currentQuestionIndex += 1;
        let currPlayerIndex = ((PLAYER_COUNT+currentQuestionIndex)%PLAYER_COUNT);
        correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        console.log(currentQuestionIndex + " < currentQuestionIndex, gameQuestions" + gameQuestions.length + " Speech" + speechOutput);
        console.log("Translated Questions:" + translatedQuestions.length);
        const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
        const roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
        const questionIndexForSpeech = Math.floor(currentQuestionIndex/PLAYER_COUNT)+1;//currentQuestionIndex + 1;
        let repromptText = "";
        speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', PLAYER_SCORES[playerIndex].toString()); //J replacing currentScore -> PLAYER_SCORES[playerIndex]

        if(PLAYER_COUNT === 1){
            repromptText = this.t('TELL_QUESTION_MESSAGE', questionIndexForSpeech.toString(), spokenQuestion);
        }else{
            if(questionIndexForSpeech === 1){ // First time say the player name to the player.
                speechOutput += this.t("SAY_PLAYER_NAME", currPlayerIndex+1, PLAYER_ALIAS[currPlayerIndex]);
            }
            repromptText += this.t('PLAYER_QUESTION_MESSAGE', PLAYER_ALIAS[currPlayerIndex], questionIndexForSpeech.toString(), spokenQuestion); //' Player ' + (playerIndex+1)
        }
        for (let i = 0; i < ANSWER_COUNT; i++) {
            repromptText += ` ${i + 1}. ${roundAnswers[i]}. `;
        }

        speechOutput += repromptText;
        Object.assign(this.attributes, {
            'speechOutput': speechOutput,
            'repromptText': repromptText,
            'currentQuestionIndex': currentQuestionIndex,
            'correctAnswerIndex': correctAnswerIndex + 1,
            'questions': gameQuestions,
            'correctAnswerText': translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0],
        });

        this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
    }
}

const startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
    'StartGame': function (newGame) {
        let speechOutput = newGame ? this.t('NEW_GAME_MESSAGE', this.t('GAME_NAME')) : '';
        
        //J If player count is not init value then prompt the message
		var topicMessage = '';
		if (TOPIC_INDEX === 1 || TOPIC_INDEX === 2 ||  TOPIC_INDEX === 3 || TOPIC_INDEX === 4) {
			topicMessage = this.t('TOPICS')[TOPIC_INDEX - 1];
		}else{
		    this.emitWithState("InvalidAnswerIntent", ["novalidtopic",0]);
		}
		console.log('Topic index selected:' + TOPIC_INDEX + ", topicMessage: " + topicMessage);
        initScores();
        if(PLAYER_COUNT > 1){
            speechOutput = this.t('PLAYER_COUNT_IS_MESSAGE', PLAYER_COUNT, topicMessage);
            speechOutput += this.t('BEGIN_GAME')[randomIndex(3)];
            speechOutput += this.t('WELCOME_MESSAGE', GAME_LENGTH.toString());
            speechOutput += this.t("SAY_PLAYER_NAME", 1, PLAYER_ALIAS[0]);

            speechOutput += PLAYER_ALIAS[0] + ", ";
            GAME_LENGTH = PLAYER_COUNT*3;
        }else if(PLAYER_COUNT == 1){
            speechOutput = this.t('SINGLE_PLAYER_GAME', topicMessage);
            speechOutput += this.t('BEGIN_GAME')[randomIndex(3)];
            speechOutput += this.t('WELCOME_MESSAGE', GAME_LENGTH.toString());
        }
        
        /*// Select GAME_LENGTH questions for the game
		if (TOPIC_INDEX !== 1 && TOPIC_INDEX !== 2 && TOPIC_INDEX !== 3) {
		    TOPIC_INDEX = randomIndex(2)+1;
		}*/
		//let topicQues = (TOPIC_INDEX == 1)? 'TOPIC_ONE' :((TOPIC_INDEX == 2)?'TOPIC_TWO' : 'TOPIC_THREE');
		//const translatedQuestions = this.t('QUESTIONS')['TOPIC_ONE'];
		var translatedQuestions = [];
		if (TOPIC_INDEX == 1) {
		    translatedQuestions = this.t('TOPICONE');
		} else if (TOPIC_INDEX == 2) {
		    translatedQuestions = this.t('TOPICTWO');
		} else if (TOPIC_INDEX == 3) {
		    translatedQuestions = this.t('TOPICTHREE');
		} else{
		    translatedQuestions = this.t('TOPICFOUR');
		}
        const gameQuestions = populateGameQuestions(translatedQuestions);
        // Generate a random index for the correct answer, from 0 to 3
        const correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        // Select and shuffle the answers for each question
        const roundAnswers = populateRoundAnswers(gameQuestions, 0, correctAnswerIndex, translatedQuestions);
        const currentQuestionIndex = 0;
        const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
        let repromptText = this.t('TELL_QUESTION_MESSAGE', '1', spokenQuestion);

        for (let i = 0; i < ANSWER_COUNT; i++) {
            repromptText += ` ${i + 1}. ${roundAnswers[i]}. `;
        }

        speechOutput += repromptText;

        Object.assign(this.attributes, {
            'speechOutput': repromptText,
            'repromptText': repromptText,
            'currentQuestionIndex': currentQuestionIndex,
            'correctAnswerIndex': correctAnswerIndex + 1,
            'questions': gameQuestions,
            'correctAnswerText': translatedQuestions[gameQuestions[currentQuestionIndex]][Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0]][0],
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        this.handler.state = GAME_STATES.TRIVIA;
        this.emit(':askWithCard', speechOutput, repromptText, this.t('GAME_NAME'), repromptText);
    },
    'StartGameNSetPlayers': function(newGame){
        GAME_LENGTH = 3;
        PLAYER_SCORES = [];
        TOPIC_INDEX = 0;
        let speechOutput = "";
        let repromptText = "";
        if(newGame){
            PLAYER_ALIAS = [];
            PLAYER_COUNT = 0;
            speechOutput = this.t('NEW_GAME_MESSAGE', this.t('GAME_NAME') + this.t('AUDIO_NEWGAME_MESSAGE'));
            // let setPlayerMsgIndex = randomIndex(3);
            repromptText = this.t('SET_PLAYER_MESSAGES')[randomIndex(3)];
        }else{
            speechOutput = this.t('RESTART_NEW_MESSAGE', GAME_LENGTH.toString());
            if(PLAYER_COUNT == 0){
                repromptText = this.t('SET_PLAYER_MESSAGES')[randomIndex(3)];
            }else{
                repromptText = this.t('CHANGE_PLAYER_COUNT');
            }
        }
        
        Object.assign(this.attributes, {
            'speechOutput': speechOutput + repromptText,
            'repromptText': repromptText,
        });
        this.emit(':ask', speechOutput + repromptText, repromptText);
    },
    'TopicSelection': function(newGame){
        let playersSelected = this.t('PLAYER_COUNT_SELECTED', PLAYER_COUNT);
        let speechOutput = this.t('TOPIC_SELECTION_MESSAGE');
        Object.assign(this.attributes, {
            'speechOutput': speechOutput,
            'repromptText': speechOutput,
        });
		this.emit(':ask', playersSelected + speechOutput, playersSelected + speechOutput);
    },
    'AnswerIntent': function(){
        if (PLAYER_COUNT == 0){
            //Set Players
            let validAnswer = isAnswerSlotValid(this.event.request.intent, PLAYER_MAX_COUNT+1);
            if (!validAnswer) {
                Object.assign(this.attributes, {
                    'speechOutput': this.attributes.speechOutput,
                    'repromptText': this.attributes.speechOutput,
                });
                this.emitWithState('InvalidAnswerIntent',["noplayerset", 0]);
            } else {
                // Setting player count..
        		PLAYER_COUNT = parseInt(this.event.request.intent.slots.Answer.value, 10);
    		    PLAYER_ALIAS = shufflePlayerNames(this.t('PLAYER_NAMES'));
        		this.emitWithState('TopicSelection', true);
            }
		} else {
    		let validAnswer = isAnswerSlotValid(this.event.request.intent, TOPIC_MAX_COUNT+1);
    		// Setting Topic 
    		let validAnswerText = isAnswerTextSlotValid(this.event.request.intent);
    		console.log("ValidAnswer" + validAnswer +", ValidText:" + validAnswerText);
    		if (!validAnswer && !validAnswerText) {
    		    Object.assign(this.attributes, {
                    'speechOutput': this.attributes.speechOutput,
                    'repromptText': this.attributes.speechOutput,
                });
                this.emitWithState('InvalidAnswerIntent', ["novalidtopic", 0]);
            }else{
                if(validAnswer){
                    TOPIC_INDEX = parseInt(this.event.request.intent.slots.Answer.value, 10);
                }else{
                    TOPIC_INDEX = validTopic(this.t['TOPICS'], this.event.request.intent.slots.AnswerText.value);
                    if(TOPIC_INDEX === -1){
                        console.log("Emitting with state invalid answer");
                        this.emitWithState('InvalidAnswerIntent', ["novalidtopic", 0]);
                    }
                }
            }
            if(TOPIC_INDEX!=-1 && PLAYER_COUNT>0)
    		    this.emitWithState('StartGame', false);
		}
    },
    'InvalidAnswerIntent': function(args) {
        // args = ["message", times]
        let invalidspeech = this.t('INVALID_ANSWER_SLOT')[args[0]];
        console.log(args[0] + ">" + invalidspeech + " INVALID >" + INVALID_COUNT);
        if(args[0] == "noplayerset" || args[0] == "novalidtopic" || args[1] == "all"){
            INVALID_COUNT = (INVALID_COUNT + 1)%3;
        }else{ // novalidans
            if(INVALID_COUNT>3){
                this.emitWithState('DontKnowIntent');
            }
            INVALID_COUNT = (INVALID_COUNT + 1)%3;
        }
        this.emit(':ask', invalidspeech[INVALID_COUNT] + this.attributes['repromptText'], this.attributes['repromptText']);
    },
    'AMAZON.YesIntent': function() {
        if (PLAYER_COUNT == 0) {
            let speechOutput = this.t('SET_PLAYER_MESSAGE');
            Object.assign(this.attributes, {
                'speechOutput': speechOutput,
                'repromptText': speechOutput,
            });
            this.emit(':ask', speechOutput, speechOutput);
        } else {
            PLAYER_COUNT = 0;
            PLAYER_ALIAS = [];
            let speechOutput = this.t('SET_PLAYER_MESSAGE');
            let repromptText = this.t('RESET_PLAYER_MESSAGE');
            Object.assign(this.attributes, {
                'speechOutput': repromptText + speechOutput,
                'repromptText': repromptText,
            });
            this.emit(':ask', speechOutput, repromptText);
            // this.handler.state = GAME_STATES.START;
            // this.emitWithState('StartGameNSetPlayers', false);
        }
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', false);
    },
    'AMAZON.NoIntent': function(){
         if (PLAYER_COUNT === 0) {
            PLAYER_COUNT = 1;
            this.emitWithState('TopicSelection', false);
         }else{
             if(TOPIC_INDEX> 0){
                this.emitWithState('InvalidAnswerIntent', ["all", 0]);
             }else{
                this.emitWithState('TopicSelection', false);
             }
         }
        // else{
        //     this.emitWithState('InvalidAnswerIntent', ["all",0]);
        // }
    },
    'AMAZON.StopIntent': function () {
        if(STOP_COUNT>0){
            this.emitWithState("AMAZON.CancelIntent");
        }
        STOP_COUNT += 1;
        this.handler.state = GAME_STATES.HELP;
        const speechOutput = this.t('STOP_MESSAGE');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.RepeatIntent': function () {
        if(this.attributes['repromptText'] != null){
            this.emit(':ask', this.attributes['repromptText'], this.attributes['repromptText']);
        }
        else{
            this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
        }
    },
    'DontKnowIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('CANCEL_MESSAGE'));
    },
    'UNKNOWN': function(){
        this.emit(':ask', this.t('HINT') + this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'Unhandled': function () {
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    //   this.emitWithState('InvalidAnswerIntent', ["all",0]);
    }
});

const triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', false);
    },
    'AMAZON.RepeatIntent': function () {
        if(this.attributes['repromptText'] != null){
            this.emit(':ask', this.attributes['repromptText'], this.attributes['repromptText']);
        }else{
            this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
        }
    },
    'DontKnowIntent': function () {
        handleUserGuess.call(this, true);
    },
    'InvalidAnswerIntent': function(args) {
        // args = ["message", times]
        INVALID_COUNT = (INVALID_COUNT + 1)%3;
        let invalidspeech = this.t('INVALID_ANSWER_SLOT')[args[0]];
        console.log(invalidspeech + " INVALID >" + INVALID_COUNT);
        if(args[0] == "noplayerset" || args[0] == "novalidtopic" || args[1] == "all"){
        }else{ // novalidans
            if(INVALID_COUNT>3){
                this.emitWithState('DontKnowIntent');
            }
        }
        this.emit(':ask', invalidspeech[INVALID_COUNT] + this.attributes['repromptText'], this.attributes['repromptText']);    
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.StopIntent': function () {
        if(STOP_COUNT>0){
            this.emitWithState("AMAZON.CancelIntent");
        }
        STOP_COUNT += 1;
        this.handler.state = GAME_STATES.HELP;
        const speechOutput = this.t('STOP_MESSAGE');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('CANCEL_MESSAGE'));
    },
    'AMAZON.YesIntent': function () {
            this.handler.state = GAME_STATES.START;
            this.emitWithState('StartGameNSetPlayers', false);
     },
    'AMAZON.NoIntent': function () {
        const speechOutput = this.t('NO_MESSAGE');
        this.emit(':tell', speechOutput);
    },
    'SessionEndedRequest': function () {
       /* this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);*/
        console.log(`Session ended in trivia state: ${this.event.request.reason}`);
    },
    'ScoreIntent': function () {
        var currentQuestionIndex = parseInt(this.attributes.currentQuestionIndex, 10);
        var playerIndex = (PLAYER_COUNT + currentQuestionIndex) % PLAYER_COUNT;
        const speechOutput = this.t('SCORE_IS_MESSAGE', PLAYER_SCORES[playerIndex].toString() +  this.attributes['repromptText']);
        this.emit(':ask', speechOutput, this.attributes['repromptText']);
    },
    'Unhandled': function () {
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AnswerIntent': function () {
        handleUserGuess.call(this, false);
    },
    'UNKNOWN': function () {
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    },
    
});

const helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
    'helpTheUser': function (newGame) {
        const askMessage = newGame ? this.t('ASK_MESSAGE_START') : this.t('REPEAT_QUESTION_MESSAGE') + this.t('STOP_MESSAGE');
        let speechOutput = "";
        if(PLAYER_COUNT!=0 && PLAYER_COUNT!=1 && TOPIC_INDEX>0){
            speechOutput = this.t('HELP_MESSAGE_MULTI', GAME_LENGTH/PLAYER_COUNT) + askMessage;
        }else{
            speechOutput = this.t('HELP_MESSAGE', GAME_LENGTH) + askMessage;
        }
        const repromptText = this.t('HELP_REPROMPT') + askMessage;
        this.emit(':ask', speechOutput, repromptText);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', false);
    },
    'AMAZON.RepeatIntent': function () {
        const newGame = !(this.attributes['speechOutput'] && this.attributes['repromptText']);
        this.emitWithState('helpTheUser', newGame);
    },
    'AMAZON.HelpIntent': function () {
        const newGame = !(this.attributes['speechOutput'] && this.attributes['repromptText']);
        this.emitWithState('helpTheUser', newGame);
    },
    'AMAZON.YesIntent': function () {
        if (this.attributes['speechOutput'] && this.attributes['repromptText']) {
            if(PLAYER_COUNT == 0 || TOPIC_INDEX == 0 || TOPIC_INDEX == -1){
                this.handler.state = GAME_STATES.START;
            }
            else{
                this.handler.state = GAME_STATES.TRIVIA;
            }
            this.emitWithState('AMAZON.RepeatIntent');
        } else {
            this.handler.state = GAME_STATES.START;
            this.emitWithState('StartGameNSetPlayers', false);
        }
    },
    'AMAZON.NoIntent': function () {
        const speechOutput = this.t('NO_MESSAGE');
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        if(STOP_COUNT>0){
            this.emitWithState("AMAZON.CancelIntent");
        }
        STOP_COUNT += 1;
        const speechOutput = this.t('STOP_MESSAGE');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('CANCEL_MESSAGE'));
    },
    'Unhandled': function () {
        const speechOutput = this.t('HELP_UNHANDLED');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        /*const newGame = !(this.attributes['speechOutput'] && this.attributes['repromptText']);
        this.emitWithState('helpTheUser', newGame);*/
        console.log(`Session ended in help state: ${this.event.request.reason}`);
    },
});

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageString;
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
    alexa.execute();
};

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
let TOPIC_MAX_COUNT = 3;
let PLAYER_COUNT = 0;
let TOPIC_INDEX = 0;
let PLAYER_SCORES = [];
let PLAYER_ALIAS = [];
const GAME_STATES = {
    TRIVIA: '_TRIVIAMODE', // Asking trivia questions.
    START: '_STARTMODE', // Entry point, start the game.
    HELP: '_HELPMODE', // The user is asking for help.
};
const APP_ID = undefined; // TODO replace with your app ID (OPTIONAL)

/**
 * When editing your questions pay attention to your punctuation. Make sure you use question marks or periods.
 * Make sure the first answer is the correct one. Set at least ANSWER_COUNT answers, any extras will be shuffled in.
 */
const languageString = {
    'en': {
        'translation': {
            'TOPICS': ['Topic one', 'Topic two', 'Topic three'],
            'TOPICONE': questions['TOPIC_ONE'],
            'TOPICTWO': questions['TOPIC_TWO'],
            'TOPICTHREE': questions['TOPIC_THREE'],
			'PLAYER_NAMES': questions['PLAYER_NAMES'],
            'GAME_NAME': 'Quiz It Up topic version', // Be sure to change this for your skill.
            'HELP_MESSAGE': 'I will ask you %s multiple choice questions. Respond with the number of the answer. ' +
                'For example, say one, two, three, or four. To start a new game at any time, say, start game. ',
            'REPEAT_QUESTION_MESSAGE': 'To repeat the last question, say, repeat. ',
            'ASK_MESSAGE_START': 'Would you like to start playing?',
            'HELP_REPROMPT': 'To give an answer to a question, respond with the number of the answer. ',
            'STOP_MESSAGE': 'Would you like to keep playing?',
            'CANCEL_MESSAGE': 'Ok, let\'s play again soon.',
            'NO_MESSAGE': 'Ok, we\'ll play another time. Goodbye!',
            'TRIVIA_UNHANDLED': 'Try saying a number between 1 and %s ',
            'HELP_UNHANDLED': 'Say yes to continue, or no to end the game.',
            'START_UNHANDLED': 'Say start to start a new game.',
            'NEW_GAME_MESSAGE': 'Welcome to %s. ',
            'AUDIO_NEWGAME_MESSAGE': '<audio src="https://ocoderjava8.000webhostapp.com/audio_clips/drumroll.mp3"/> Welcome to %s',
            'WELCOME_MESSAGE': 'I will ask you %s questions, try to get as many right as you can. ' +
            'Just say the number of the answer.',
            'ANSWER_CORRECT_MESSAGE': 'correct. ',
            'ANSWER_WRONG_MESSAGE': 'wrong. ',
            'CORRECT_ANSWER_MESSAGE': 'The correct answer is %s: %s. ',
            'ANSWER_IS_MESSAGE': 'That answer is ',
            'TELL_QUESTION_MESSAGE': 'Question %s. %s ',
            'PLAYER_QUESTION_MESSAGE': '%s, Question %s. %s ',
            'GAME_OVER_MESSAGE': 'You got %s out of %s questions correct. Thank you for playing!',
            'SCORE_IS_MESSAGE': 'Your score is %s. ',
            'SET_PLAYER_MESSAGES': ['Got any Friends to play along? ', 'Got Friends with you to compete? ', 'Competing with someone? '],
            'SET_PLAYER_MESSAGE': 'I can take five players. How many players?',
            'PLAYER_COUNT_IS_MESSAGE': ' Done, %s players on %s topic ',
            'SINGLE_PLAYER_GAME': 'Going solo on %s ',
            'BEGIN_GAME': [' Off to the game now. ', 'Let\'s begin. ', 'Let\'s get going. '],
            'WIN_ANNOUNCE': 'And the winner is %s with a score of %s',
            'TIE_ANNOUNCE': 'Oh, no! it\'s a tie!! ',
            'SAY_PLAYER_NAME': ' Now player %s, Let me just call you %s. ',
            'PLAYER_COUNT_SELECTED': ' %s player game it is. ',
			'TOPIC_SELECTION_MESSAGE': ' Say one for Topic one, two for Topic two, three for Topic three ',
			'INVALID_ANSWER_SLOT': 'Sorry I didn\'t get you, Let me repeat the question',
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
        throw new Error('Invalid Game Length.');
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

    return gameQuestions;
}

/**
 * Get the answers for a given question, and place the correct answer at the spot marked by the
 * correctAnswerTargetLocation variable. Note that you can have as many answers as you want but
 * only ANSWER_COUNT will be selected.
 * */
function populateRoundAnswers(gameQuestionIndexes, correctAnswerIndex, correctAnswerTargetLocation, translatedQuestions) {
    const answers = [];
    const answersCopy = translatedQuestions[gameQuestionIndexes[correctAnswerIndex]][Object.keys(translatedQuestions[gameQuestionIndexes[correctAnswerIndex]])[0]].slice();
    let index = answersCopy.length;

    if (index < ANSWER_COUNT) {
        throw new Error('Not enough answers for question.');
    }

    // Shuffle the answers, excluding the first element which is the correct answer.
    for (let j = 1; j < answersCopy.length; j++) {
        const rand = Math.floor(Math.random() * (index - 1)) + 1;
        index -= 1;

        const swapTemp1 = answersCopy[index];
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
    var maxScore  = Math.max.apply(Math, PLAYER_SCORES)
    if (PLAYER_SCORES.indexOf(maxScore) == PLAYER_SCORES.lastIndexOf(maxScore)) {
        return PLAYER_SCORES.indexOf(maxScore);
    } else {
        return -1;
    }
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
    var translatedQuestions = [];
    if (TOPIC_INDEX == 1) {
        translatedQuestions = this.t('TOPICONE');
    } else if (TOPIC_INDEX == 2) {
		translatedQuestions = this.t('TOPICTWO');
	} else if (TOPIC_INDEX == 3) {
		translatedQuestions = this.t('TOPICTHREE');
	}
    const answerTextSlotValid = isAnswerTextSlotValid(this.event.request.intent);
    //const isPartialAnswer = ;
    let playerIndex = ((PLAYER_COUNT+currentQuestionIndex)%PLAYER_COUNT);
    
    if ((answerSlotValid && parseInt(this.event.request.intent.slots.Answer.value, 10) === this.attributes['correctAnswerIndex']) || (answerTextSlotValid && 
    correctAnswerText.toLowerCase().includes(this.event.request.intent.slots.AnswerText.value.toLowerCase()))) {
        //currentScore++;
        PLAYER_SCORES[playerIndex] += 1;
        speechOutputAnalysis = this.t('ANSWER_CORRECT_MESSAGE');
    } else {
        if (!answerSlotValid && !userGaveUp) {
            this.emitWithState('InvalidAnswerIntent');
        } else if (!userGaveUp) {
            speechOutputAnalysis = this.t('ANSWER_WRONG_MESSAGE');
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
                 speechOutput += this.t('WIN_ANNOUNCE', 'Player '+ PLAYER_ALIAS[winningPlayerIndex].toString(), PLAYER_SCORES[winningPlayerIndex]);
             } else {
                 speechOutput += this.t('TIE_ANNOUNCE');
             }
        }
		//this.emit(':tell', speechOutput);
		speechOutput += 'Do you want to continue ?';
		//can ask if the user wants to continue
		this.emit(':ask', speechOutput, this.attributes['repromptText']);
    } else {
        currentQuestionIndex += 1;
        let currPlayerIndex = ((PLAYER_COUNT+currentQuestionIndex)%PLAYER_COUNT);
        correctAnswerIndex = Math.floor(Math.random() * (ANSWER_COUNT));
        const spokenQuestion = Object.keys(translatedQuestions[gameQuestions[currentQuestionIndex]])[0];
        const roundAnswers = populateRoundAnswers.call(this, gameQuestions, currentQuestionIndex, correctAnswerIndex, translatedQuestions);
        const questionIndexForSpeech = Math.floor(currentQuestionIndex/PLAYER_COUNT)+1;//currentQuestionIndex + 1;
        let repromptText = "";
        if(PLAYER_COUNT === 1){
            repromptText = this.t('TELL_QUESTION_MESSAGE', questionIndexForSpeech.toString(), spokenQuestion);
        }else{
            if(questionIndexForSpeech === 1){ // First time say the player name to the player.
                repromptText += this.t("SAY_PLAYER_NAME", currPlayerIndex+1, PLAYER_ALIAS[currPlayerIndex]);
            }
            repromptText += this.t('PLAYER_QUESTION_MESSAGE', PLAYER_ALIAS[currPlayerIndex], questionIndexForSpeech.toString(), spokenQuestion); //' Player ' + (playerIndex+1)
        }
        for (let i = 0; i < ANSWER_COUNT; i++) {
            repromptText += `${i + 1}. ${roundAnswers[i]}. `;
        }

        speechOutput += userGaveUp ? '' : this.t('ANSWER_IS_MESSAGE');
        speechOutput += speechOutputAnalysis + this.t('SCORE_IS_MESSAGE', PLAYER_SCORES[playerIndex].toString()) + repromptText; //J replacing currentScore -> PLAYER_SCORES[playerIndex]

        Object.assign(this.attributes, {
            'speechOutput': repromptText,
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
		let topicMessage = 'Random';
		if (TOPIC_INDEX == 1 || TOPIC_INDEX == 2 ||  TOPIC_INDEX == 3) {
			topicMessage = this.t('TOPICS')[TOPIC_INDEX - 1];
		}
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
            repromptText += `${i + 1}. ${roundAnswers[i]}. `;
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
        PLAYER_ALIAS = [];
        PLAYER_SCORES = [];
        PLAYER_COUNT = 0;
        TOPIC_INDEX = 0;
        GAME_LENGTH = 3;
        let speechOutput = newGame ? this.t('NEW_GAME_MESSAGE', this.t('GAME_NAME')) : this.t('WELCOME_MESSAGE', GAME_LENGTH.toString());
        let setPlayerMsgIndex = randomIndex(3);
        speechOutput += this.t('SET_PLAYER_MESSAGES')[setPlayerMsgIndex];
        Object.assign(this.attributes, {
            'speechOutput': speechOutput,
            'repromptText': speechOutput,
        });
        this.emit(':ask', speechOutput, speechOutput);
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
            let validAnswer = isAnswerSlotValid(this.event.request.intent, PLAYER_MAX_COUNT+1);
            if (!validAnswer) {
                Object.assign(this.attributes, {
                    'speechOutput': this.attributes.speechOutput,
                    'repromptText': this.attributes.speechOutput,
                });
                this.emitWithState('InvalidAnswerIntent');
            } else {
        		PLAYER_COUNT = parseInt(this.event.request.intent.slots.Answer.value, 10);
    		    PLAYER_ALIAS = shufflePlayerNames(this.t('PLAYER_NAMES'));
        		this.emitWithState('TopicSelection', true);
            }
		} else {
    		let validAnswer = isAnswerSlotValid(this.event.request.intent, TOPIC_MAX_COUNT+1);
    		if (!validAnswer) {
    		    Object.assign(this.attributes, {
                    'speechOutput': this.attributes.speechOutput,
                    'repromptText': this.attributes.speechOutput,
                });
                this.emitWithState('InvalidAnswerIntent');
            }
    		TOPIC_INDEX = parseInt(this.event.request.intent.slots.Answer.value, 10);
    		this.emitWithState('StartGame', false);
		}
    },
    'InvalidAnswerIntent': function() {
        this.emit(':ask', this.t('INVALID_ANSWER_SLOT') + this.attributes['speechOutput'], this.attributes['repromptText']);
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
            this.handler.state = GAME_STATES.START;
            this.emitWithState('StartGameNSetPlayers', true);
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
        }
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        const speechOutput = this.t('STOP_MESSAGE');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'DontKnowIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
});

const triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGameNSetPlayers', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'DontKnowIntent': function () {
        handleUserGuess.call(this, true);
    },
    'InvalidAnswerIntent': function() {
        this.emit(':ask', this.t('INVALID_ANSWER_SLOT') + this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser', false);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        const speechOutput = this.t('STOP_MESSAGE');
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('CANCEL_MESSAGE'));
    },
    'AMAZON.YesIntent': function () {
            this.handler.state = GAME_STATES.START;
            this.emitWithState('StartGameNSetPlayers', true);
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
        var playerIndex = (PLAYER_COUNT - 1 + currentQuestionIndex) % PLAYER_COUNT;
        const speechOutput = this.t('SCORE_IS_MESSAGE', PLAYER_SCORES[playerIndex].toString() +  this.attributes['speechOutput']);
        this.emit(':ask', speechOutput, this.attributes['repromptText']);
    },
    'Unhandled': function () {
        const speechOutput = this.t('TRIVIA_UNHANDLED', ANSWER_COUNT.toString());
        this.emit(':ask', speechOutput, speechOutput);
    },
    'AnswerIntent': function () {
        handleUserGuess.call(this, false);
    },
});

const helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
    'helpTheUser': function (newGame) {
        const askMessage = newGame ? this.t('ASK_MESSAGE_START') : this.t('REPEAT_QUESTION_MESSAGE') + this.t('STOP_MESSAGE');
        const speechOutput = this.t('HELP_MESSAGE', GAME_LENGTH) + askMessage;
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
            this.handler.state = GAME_STATES.TRIVIA;
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
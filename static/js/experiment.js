const PARAMS = {
  train_presentation_duration: 3000,
  n_pair: 10,
  n_repeat: 5,
  overlay: true,
  // n_test: 2,
  bonus_rate: 5,
  test_type: 'simple'
}

const PROLIFIC_CODE = '3854D3C0'

var BONUS = 0

searchParams = new URLSearchParams(location.search)
updateExisting(PARAMS, mapObject(Object.fromEntries(searchParams), maybeJson))

function button_trial(html) {
  return {
    stimulus: markdown(html),
    type: "html-button-response",
    is_html: true,
    choices: ['Continue'],
    button_html: '<button class="btn btn-primary btn-lg">%choice%</button>',
  }
}

async function initializeExperiment() {
  LOG_DEBUG('initializeExperiment');

  ///////////
  // Setup //
  ///////////

  const stimuli = await $.getJSON('static/stimuli/stimuli.json')
  
  let images = Object.values(stimuli.images).map(_.sample)
  jsPsych.pluginAPI.preloadImages(images);
  // psiturk.preloadImages(images);
  let pairs = mapObject(stimuli.words, words => {
    return _.sample(words, PARAMS.n_pair).map(word => {
      let image = images.pop()
      return {word, image}
    })
  })
  let all_pairs = pairs.low.concat(pairs.high)

  let train_trials = all_pairs.map(({image, word}) => {
    let stimulus = PARAMS.overlay ? `
      <div class="image-container">
        <img src="${image}"">
        <div class="centered-text">
          ${word}
        </div>
      </div>
    ` : `
      <div class="image-container">
        <img src="${image}">
      </div>
      <div class="word-stim">${word}</div>
    `
    return {stimulus};
  })

  let train_block = {
    type: 'html-keyboard-response',
    stimulus_duration: PARAMS.train_presentation_duration,
    trial_duration:  PARAMS.train_presentation_duration + 500,
    choices: [],
    timeline: _.range(PARAMS.n_repeat).reduce(acc => acc.concat(_.shuffle(train_trials)), [])
  };

  //////////////////
  // Instructions //
  //////////////////

  let welcome_block = button_trial(`
    # Instructions

    In this experiment, you will play a memory game where you learn pairings
    between images and words. In the training stage, you will view images with
    words on them. Try to make an association between the image and the word
    presented. Once the training stage is completed, you will be tested on
    your knowledge and have an opportunity to earn a bonus of up to one dollar.`)

  let multi_instruct =  `
    # Training complete

    You're now ready to test your knowledge! On each round, we will display two 
    of the pictures you saw before. They will be covered by gray boxes, but you
    can hover over the box with your mouse to show the image. You only need to
    remember the word associated with *one* of them. When you're ready to guess,
    click on the image you think you know the word for. A text box will appear
    and you'll have five seconds to type the word. Hit enter to submit, and the
    next trial will begin.

    You'll earn ${PARAMS.bonus_rate} cents for each correct response you give!
    Click continue to try a practice trial.
  `

  let simple_instruct = `
    # Training complete

    You're now ready to test your knowledge! On each round, we will display a
    picture you saw before along with a text box. When you're ready to guess,
    press space. A text box will appear and you'll have five seconds to type
    the word. Hit enter to submit, and the next trial will begin.

    You'll earn ${PARAMS.bonus_rate} cents for each correct response you give!
    Click continue to try a practice trial.
  `

  let n_round = (PARAMS.test_type == 'simple' ? PARAMS.n_pair * 2 : PARAMS.n_pair) - 1
  let post_practice = button_trial(`
    # Practice complete

    You'll now get to test your knowledge on ${n_round} rounds. Remember, you
    earn ${PARAMS.bonus_rate} cents for every correct response. (The practice
    trial was a freebie, but the next ones count!)
  `)
  let test_instruct = button_trial(PARAMS.test_type == 'simple' ? simple_instruct : multi_instruct)



  let test_trials = PARAMS.test_type == 'simple' ?
    _.shuffle(pairs.low.concat(pairs.high)) :
    _.zip(pairs.low, pairs.high).map(options => ({options}))

  let test_practice = {
    type: `${PARAMS.test_type}-recall`,
    bonus: PARAMS.bonus_rate,
    practice: true,
    timeline: [test_trials.pop()]
  };

  let test_block = {
    type: `${PARAMS.test_type}-recall`,
    bonus: PARAMS.bonus_rate,
    timeline: test_trials.map((trial, idx) => {
      return {...trial, idx}
    })
  }

  let debrief = {
    type: 'survey-text',
    preamble: markdown(`
      # Study complete

      Thanks for participating! You earned a bonus of $${(BONUS / 100).toFixed(2)}.
      Please provide feedback on the study below.
      You can leave a box blank if you have no relevant comments.
    `),
    questions: [
      'Were the instructions confusing, hard to understand, or too long?',
      'Was the interface at all difficult to use?',
      'Did you experience any technical problems (e.g., images not displaying)?',
      'Any other comments?',
    ].map(prompt => ({prompt, rows: 2, columns: 70}))
  }

  /////////////////////////
  // Experiment timeline //
  /////////////////////////

  let timeline = [
    welcome_block,
    train_block,
    test_instruct,
    test_practice,
    test_block,
    debrief,
  ];

  let skip = searchParams.get('skip');
  if (skip != null) {
    timeline = timeline.slice(skip);
  }

  return startExperiment({
    timeline,
    exclusions: {
      min_width: 800,
      min_height: 600
    },
  });
};



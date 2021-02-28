const PARAMS = {
  train_presentation_duration: 3000,
  recall_time: 10000,
  afc_time: 3000,
  n_pair: 10,
  n_repeat: 3,
  overlay: true,
  // n_test: 2,
  bonus_rate: 2,
  bonus_rate_afc: 1,
  test_type: 'simple',
  n_distractor: 1,
}
searchParams = new URLSearchParams(location.search)
updateExisting(PARAMS, mapObject(Object.fromEntries(searchParams), maybeJson))
psiturk.recordUnstructuredData('params', PARAMS);

const PROLIFIC_CODE = '6BF8D28B'
var BONUS = 0
XX = null

function button_trial(html, opts={}) {
  return {
    stimulus: markdown(html),
    type: "html-button-response",
    is_html: true,
    choices: ['Continue'],
    button_html: '<button class="btn btn-primary btn-lg">%choice%</button>',
    ...opts
  }
}

async function initializeExperiment() {
  LOG_DEBUG('initializeExperiment');

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
  XX = all_pairs

  let welcome_block = button_trial(`
    # Instructions

    In this experiment, you will play a memory game where you learn pairings
    between images and words. You will do a total of four rounds learning the pairs
    and testing your knowledge. In each test round, you can earn a bonus, up to a total
    of $1.50.
  `)

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

  function make_train_block(i) {
    let intro = button_trial(`
      # Training (${i+1} / ${PARAMS.n_repeat})

      You will see a series of images with words printed on top. Try to
      commit each pair to memory. You will be tested on them later.
      Note: the pairs are the same for the entire experiment.
    `)
    let block = {
      type: 'html-keyboard-response',
      stimulus_duration: PARAMS.train_presentation_duration,
      trial_duration:  PARAMS.train_presentation_duration + 500,
      choices: [],
      timeline: _.shuffle(train_trials)
    }
    return {timeline: [intro, block]}
  }

  function make_afc_block(i) {
    let intro = button_trial(`
      # Test (${i+1} / ${PARAMS.n_repeat})

      Now we'll see how well you've learned the pairs. On each round,
      you will see a word and two images. Then you'll have ${PARAMS.afc_time / 1000} 
      seconds to select the image that goes with the pair.

      You will earn one cent for each correct answer. However, to make things
      harder, we won't tell you which ones were correct! 😉
    ` + ((i == 0) ? "We'll start with a practice round." : ""))
    let timeline = _.chain(all_pairs)
      .shuffle()
      .map(({image, word}, i, arr) => ({
        word: word,
        target_image: image,
        distractor_images: [arr[(i+1) % arr.length].image],
      }))
      .shuffle()
      .value()
    if (i == 0) timeline[0].practice = true
    let block = {
      type: 'afc',
      max_time: PARAMS.afc_time,
      timeline
    }
    let feedback = button_trial(`
      # Results

      You answered ...
    `)
    return {timeline: [intro, block, feedback]}
  }

  let train_afc_blocks = []
  _.range(PARAMS.n_repeat).forEach(i => {
    train_afc_blocks.push(make_train_block(i))
    train_afc_blocks.push(make_afc_block(i))
  })


  let distractor_intro = button_trial(`
    # Math challenge

    Before you continue to the memory test phase, you will have an opportunity
    to earn some extra bonus money in a speeded math challenge. In each round,
    you'll see a simple arithmetic problem and you'll have five seconds to 
    type in the answer (press enter to submit). You'll earn one cent
    for each correct answer!
  `)
    // ${PARAMS.distractor_bonus_rate} cents for each correct answer!
  let distractor_task = {
    type: 'math',
    maxTime: 3,
    numQuestions: 10,
    bonusRate: 1,
  }
  let distractor = {timeline: [distractor_intro, distractor_task]}
  

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
    // When you're ready to guess,
    // press space. A text box will appear and you'll have five seconds to type
    // the word. Hit enter to submit, and the next trial will begin.

  let simple_instruct = `
    # Training complete

    You're now ready to test your knowledge! On each round, we will display a
    picture you saw before and you'll have ${PARAMS.recall_time / 1000} seconds to
    enter the word that was paired with the image.

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
    recall_time: PARAMS.recall_time,
    practice: true,
    timeline: [test_trials.pop()]
  };

  let test_block = {
    type: `${PARAMS.test_type}-recall`,
    bonus: PARAMS.bonus_rate,
    recall_time: PARAMS.recall_time,
    timeline: test_trials.map((trial, idx) => {
      return {...trial, idx}
    })
  }

  let debrief = {
    type: 'survey-text',
    preamble: () => {
      psiturk.recordUnstructuredData('bonus', BONUS / 100);
      return markdown(`
        # Study complete

        Thanks for participating! You earned a bonus of $${(BONUS / 100).toFixed(2)}.
        Please provide feedback on the study below.
        You can leave a box blank if you have no relevant comments.
      `)
    },
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
    ...train_afc_blocks,
    // train_block,
    distractor,
    test_instruct,
    test_practice,
    post_practice,
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



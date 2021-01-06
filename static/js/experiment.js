const PARAMS = {
  train_presentation_duration: 3000,
  n_pair: 10,
  n_repeat: 5,
  overlay: false,
}

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

  var train_trials = all_pairs.map(({image, word}) => {
    var stimulus = PARAMS.overlay ? `
      <div class="image-container">
      <img src="${image}"">
        <div class="centered-text">
          ${word}
        </div>
      </div>
    ` : `
      <div class="image-container">
      <img src="${image}" style="width:100%;">
      </div>
      <div class="word-stim">${word}</div>
    `
    return {stimulus};
  })

  var train_block = {
    type: 'html-keyboard-response',
    stimulus_duration: PARAMS.train_presentation_duration,
    trial_duration:  PARAMS.train_presentation_duration + 500,
    choices: [],
    timeline: _.range(PARAMS.n_repeat).reduce(acc => acc.concat(_.shuffle(train_trials)), [])
  };

  //////////////////
  // Instructions //
  //////////////////

  var welcome_block = button_trial(`
    # Instructions

    In this experiment, we will test your memory. We will show a series of images
    paired with words... yada yada
  `)

  var test_instruct = button_trial(`
    # Training complete

    You're now ready to test your knowledge! On each round, we will display two 
    of the pictures you saw before. They will be covered by gray boxes, but you
    can hover over the box with your mouse to show the image. You only need to
    remember the word associated with *one* of them. When you're ready to guess,
    click on the image you think you know the word for. A text box will appear
    and you'll have five seconds to type the word. Hit enter to submit, and the
    next trial will begin.

    We'll start with a pratice trial.
  `)
  
  // var test_review = button_trial(`
  //   # Review

  //   Great! To quickly review...

  //   - Hover over the gray boxes to show the image underneath.
  //   - As soon as you remember the word for an image, click on it.
  //   - Type the word into the text box and hit enter.
  // `)

  var test_trials = _.zip(pairs.low, pairs.high).map(options => ({options}))
  console.log(test_trials)

  var test_practice = {
    type: 'memtest',
    practice: true,
    timeline: [test_trials.pop()]
  };

  var test_block = {
    type: 'memtest',
    timeline: test_trials
  }

  var debrief = button_trial(`
    # Task complete

    Thanks for participating!
  `);


  /////////////////////////
  // Experiment timeline //
  /////////////////////////

  var timeline = [
    welcome_block,
    train_block,
    test_instruct,
    test_practice,
    test_block,
    debrief,
    // ...train_trials,
  ];

  var skip = searchParams.get('skip');
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



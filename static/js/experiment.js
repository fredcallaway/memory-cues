var IMAGE_NAMES = ['blue', 'orange']
var WORDS = ['apple', 'contemporary']
var TRAIN_PRESENTATION_DURATION = 3000

searchParams = new URLSearchParams(location.search)

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

  // trials = await $.getJSON 'static/json/rewards/increasing.json'
  const N_TRIAL = 4;

  // This ensures that images appear exactly when we tell them to.
  var images = IMAGE_NAMES.map(name => `static/images/${name}.png`);
  jsPsych.pluginAPI.preloadImages(images);


  var pairs = _.zip(_.shuffle(images), _.shuffle(WORDS));

  var train_trials = pairs.map(([image, word]) => {
    var html = `
      <div class="image-container">
      <img src="${image}" style="width:100%;">
        <div class="centered-text">${word}</div>
      </div>
    `;
    return {
      type: 'html-keyboard-response',
      stimulus: html,
      choices: [],
      trial_duration: TRAIN_PRESENTATION_DURATION
    };
  });

  console.log(train_trials);

  // To avoid repeating ourselves,  we create a variable for a piece
  // of html that we use multiple times.
  var anykey = "<div class='lower message'>Press any key to continue.</div>";


  //////////////////
  // Instructions //
  //////////////////

  var welcome_block = {
    type: "html-keyboard-response",
    // We use the handy markdown function (defined in utils.js) to format our text.
    stimulus: markdown(`
    # Welcome

    These are instructions.

    ${anykey}
    `)
  };

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

  var test_practice = {
    type: 'memtest',
    practice: true,
    options: [
      {word: 'foo', image: images[0]},
      {word: 'bar', image: images[1]}
    ]
  };

  var debrief = button_trial(`
    # Task complete

    Thanks for participating!
  `)


  /////////////////////////
  // Experiment timeline //
  /////////////////////////

  var timeline = [
    test_instruct,
    test_practice,
    // test_trial,
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



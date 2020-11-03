var IMAGE_NAMES = ['blue', 'orange']
var WORDS = ['apple', 'contemporary']
var TRAIN_PRESENTATION_DURATION = 3000

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
    # My Sweet Experiment

    This is a reworked version of the go/no-go task constructed in a
    [tutorial](http://docs.jspsych.org/tutorials/rt-task/) 
    on the jsPsych website. Note that the code here is a little different
    than the original.

    Specifically, the code here is better. 😉

    ${anykey}
    `)
  };

  /////////////////////////
  // Experiment timeline //
  /////////////////////////

  // `timeline` determines the high-level structure of the
  // experiment. When developing the experiment, you
  // can comment out blocks you aren't working on
  // so you don't have to click through them to test
  // the section you're working on.
  var timeline = [
    welcome_block,
    ...train_trials,
    debrief_block,
  ];


  return startExperiment({
    timeline,
    exclusions: {
      min_width: 800,
      min_height: 600
    },
  });
};



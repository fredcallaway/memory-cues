
const PARAMS = { // = PARAMS =
  test_type: 'multi',
  overlay: true,

  train_presentation_duration: 3000,
  recall_time: 10000,
  afc_time: null,
  afc_bonus_time: 5000,
  
  n_pair: 10,
  n_repeat: 3,
  n_distractor: 10,
  
  bonus_rate_critical: 2,
  bonus_rate_afc: 1,
  bonus_rate_distractor: 1,
  bonus_rate_speed: 0.25,
}

searchParams = new URLSearchParams(location.search)
updateExisting(PARAMS, mapObject(Object.fromEntries(searchParams), maybeJson))
psiturk.recordUnstructuredData('params', PARAMS);

const PROLIFIC_CODE = '6BF8D28B'
var BONUS = 0
fmt_bonus = () => `$${(BONUS / 100).toFixed(2)}`

function fmt_cents(cents) {
  if (cents == 1) return 'one cent'
  return `${cents} cents`
}
XX = null

var CRITICAL_PAIRS

if (searchParams.get('debug_multi', false)) {
  AFC_LOG = [{"word":"crook","correct":false,"rt":3422},{"word":"fellow","correct":true,"rt":2233},{"word":"mister","correct":false,"rt":1351},{"word":"magazine","correct":true,"rt":2937},{"word":"tulip","correct":false,"rt":2808},{"word":"seagull","correct":true,"rt":3688},{"word":"mister","correct":false,"rt":1616},{"word":"crook","correct":false,"rt":3350},{"word":"tulip","correct":true,"rt":848},{"word":"seagull","correct":true,"rt":725},{"word":"fellow","correct":true,"rt":1467},{"word":"magazine","correct":true,"rt":1673}]
  PARAMS.n_pair = 3
  searchParams.set('skip', 8)
}

function button_trial(html, opts={}) {
  return {
    stimulus: () => {
      if (typeof html === 'function') {
        html = html.call()
      }
      return markdown(html)
    },
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
  PAIRS = pairs
  let all_pairs = pairs.low.concat(pairs.high)
  XX = all_pairs

  let max_bonus = 
    (PARAMS.bonus_rate_afc + PARAMS.bonus_rate_speed) * PARAMS.n_pair * 2 * PARAMS.n_repeat +
    PARAMS.bonus_rate_distractor * PARAMS.n_distractor +
    (PARAMS.bonus_rate_critical + PARAMS.bonus_rate_speed) * (PARAMS.test_type == 'simple' ? PARAMS.n_pair * 2 : PARAMS.n_pair)
  
  let welcome_block = button_trial(`
    # Welcome 😃

    In this experiment, you will play a memory game where you learn pairings
    between images and words. You'll begin with three rounds of learning
    and testing your knowledge. You will earn a bonus for each correct response
    you give. Finally, you will complete two additional test rounds where
    you can earn additional bonus money. The maximum bonus is $${(max_bonus / 100).toFixed(2)}.
  `, {
    on_finish: psiturk.finishInstructions
  })

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
      you will see a word and two images. ${PARAMS.afc_time == null ? `
        Try to select the image that goes with the word.
      ` : `
        Then you'll have ${PARAMS.afc_time / 1000} seconds to select the image that goes with the word.
      `}

      You will earn ${fmt_cents(PARAMS.bonus_rate_distractor)} for each
      correct answer. You will also receive a small extra bonus for answering
      quickly (and correctly), so try to respond as fast as you can
      (while staying accurate)!

      However, to make things harder, we won't tell you which
      ones were correct! 😉
    ` + ((i == 0) ? "We'll start with a practice round." : ""))
    
    let timeline = _.chain(all_pairs)
      .shuffle()
      .map(({image, word}, i, arr) => ({
        word: word,
        target_image: image,
        lure_images: [arr[(i+1) % arr.length].image],
      }))
      .shuffle()
      .value()
    if (i == 0) timeline[0].practice = true
    
    var n_correct = 0
    var time_bonus = 0
    let block = {
      type: 'afc',
      max_time: PARAMS.afc_time,
      bonus_rate: PARAMS.bonus_rate_afc,
      timeline,
      on_finish: data => {
        n_correct += data.correct
        if (data.correct) {
          let prop_left = (PARAMS.afc_bonus_time - data.rt) / PARAMS.afc_bonus_time
          time_bonus += prop_left * PARAMS.bonus_rate_speed
        }
      }
    }
    
    let feedback = button_trial(() => {
      // saveData()
      time_bonus = Math.ceil(time_bonus)
      BONUS += time_bonus
      return `
        # Results

        - You were correct on ${n_correct} out of ${block.timeline.length} rounds. 
           That's ${fmt_cents(n_correct * PARAMS.bonus_rate_afc)} added to your bonus.
        - You earned ${fmt_cents(time_bonus)} for responding quickly.
        - Your current bonus is ${fmt_bonus()}.
      `
    })
    return {timeline: [intro, block, feedback]}
  }

  let train_afc_blocks = []
  _.range(PARAMS.n_repeat).forEach(i => {
    train_afc_blocks.push(make_train_block(i))
    train_afc_blocks.push(make_afc_block(i))
  })

  let distractor_intro = button_trial(`
    # Math challenge

    Before continuing to the final memory test, you can earn some extra bonus
    money in a speeded math challenge. On each round, you'll see a simple
    arithmetic problem and you'll have five seconds to type in the answer
    (press enter to submit). You'll earn ${fmt_cents(PARAMS.bonus_rate_distractor)}
    for each correct answer!
  `)
    // ${PARAMS.distractor_bonus_rate} cents for each correct answer!
  let distractor_task = {
    type: 'math',
    maxTime: 3,
    numQuestions: PARAMS.n_distractor,
    bonusRate: PARAMS.bonus_rate_distractor,
  }
  let distractor = {timeline: [distractor_intro, distractor_task]}

  let type_instruct = {
    simple: `
      On each round, we will display one of the pictures you saw before and
      you'll have ${PARAMS.recall_time / 1000} seconds to type in the word that
      was paired with the image.
    `,
    multi: `
      On each round, you will be shown two images. You only have to remember
      the word associated with _one_ of them. We will only display one image
      at a time, but you can switch between them using the space bar. As soon
      as you remember one of the words, make sure it is the one ...

      associated image. A text box will appear and you'll have five
      seconds to type the word. Hit enter to submit, and the next trial will
      begin.
    `
  }[PARAMS.test_type]

  let test_instruct = button_trial(`
    # Final test

    You're almost done! In this last section, we will test your knowledge one
    more time. But it will be a little different this time. ${type_instruct}
    
    These rounds are harder, so you'll earn a higher bonus,
    ${PARAMS.bonus_rate_critical} cents for each correct response you give.
    Like before, you will earn a little extra money for responding quickly,
    so try to be as fast as you can while maintaining accuracy!
    We'll start with a practice round.
  `, {
    on_finish() {
      console.log('building critical trials')
      // build the critical trials
      let = scores = _.chain(AFC_LOG)
      .groupBy("word")
      .mapObject((record) => record.reduce(({rt}) => Math.log(rt)))
      .value()
      psiturk.recordUnstructuredData('afc_scores', scores)
      console.log('scores', scores)

      let sorted_pairs = pairs.low.concat(pairs.high)
      .sort(({word}) => scores[word])

      CRITICAL_PAIRS = _.zip(
        sorted_pairs.slice(0, PARAMS.n_pair),
        sorted_pairs.slice(PARAMS.n_pair).reverse()
      )
      psiturk.recordUnstructuredData('critical_pairs', CRITICAL_PAIRS)
      console.log('CRITICAL_PAIRS', CRITICAL_PAIRS)
    }
  })

  let critical_timeline = {
    simple() {
      let timeline = _.shuffle(pairs.low.concat(pairs.high))
      timeline[0].practice = true
      return timeline
    },
    multi() {
      let timeline = _.chain(PARAMS.n_pair)
      .range()
      .map(idx => {
        return {
          options() {
            return _.shuffle(CRITICAL_PAIRS[idx])
          }
        }
      })
      .shuffle()
      .value()
      timeline[0].practice = true
      return timeline
    }
  }

  var test_time_bonus = 0
  let test_block = {
    type: `${PARAMS.test_type}-recall`,
    bonus: PARAMS.bonus_rate_critical,
    recall_time: PARAMS.recall_time,
    timeline: critical_timeline[PARAMS.test_type](),
    on_finish(data) {
      console.log("ON FINISH")
      let x = _.last(data.events)
      if (x.event == "response" && x.word == x.response) {
        let rt = x.time - data.events[0].time
        let prop_left = (PARAMS.recall_time - rt) / PARAMS.recall_time
        prop_left = Math.max(0, prop_left)
        test_time_bonus += prop_left * PARAMS.bonus_rate_speed
      }
    },
  }

  let debrief = {
    type: 'survey-text',
    preamble: () => {
      BONUS += Math.ceil(test_time_bonus)
      psiturk.recordUnstructuredData('bonus', BONUS / 100);
      return markdown(`
        # Study complete

        Thanks for participating! You earned a bonus of ${fmt_bonus()}.
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

  let test_multi = {
    type: `multi-recall`,
    bonus: PARAMS.bonus_rate_critical,
    recall_time: PARAMS.recall_time,
    options: [{"word":"rouge","image":"../static/stimuli/images/pool/sun_antxeexzhaspkvlj.jpg"},{"word":"antelope","image":"../static/stimuli/images/river/sun_aiazxjumlgdcrfpn.jpg"}]
  }
  
  let timeline = [  // = timeline =
    // test_multi,
    welcome_block,
    ...train_afc_blocks,
    distractor,
    test_instruct,
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
      min_width: 900,
      min_height: 600
    },
  });
};



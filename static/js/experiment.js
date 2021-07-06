
const PARAMS = { // = PARAMS =
  pretest_type: 'simple-recall',
  critical_type: 'multi-recall',
  overlay: true,
  fancy_critical: false,  

  train_presentation_duration: 2000,
  recall_time: 15000,
  afc_time: null,
  afc_bonus_time: 5000,
  
  n_pair: 20,
  n_repeat: 2,
  n_practice_critical: 3,
  n_distractor: 10,

  bonus_rate_critical: 2,
  bonus_rate_critical_speed: 1/10,
  bonus_rate_afc: 1,
  bonus_rate_pretest: 1,
  bonus_rate_distractor: 1,
  bonus_rate_speed: 0.25,
}

searchParams = new URLSearchParams(location.search)
updateExisting(PARAMS, mapObject(Object.fromEntries(searchParams), maybeJson))
psiturk.recordUnstructuredData('params', PARAMS);

const PROLIFIC_CODE = '6BF8D28B'
var BONUS = 0
fmt_bonus = () => `$${(Math.max(BONUS, 0) / 100).toFixed(2)}`

function fmt_cents(cents) {
  if (cents == 1) return 'one cent'
  return `${cents} cents`
}
XX = null

var CRITICAL_PAIRS
var PRETEST_LOG = []

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

  if (searchParams.get('debug_multi', false)) {
    AFC_LOG = [{"word":"pig","correct":false,"rt":6006},{"word":"goddess","correct":false,"rt":458},{"word":"parrot","correct":true,"rt":214},{"word":"suburb","correct":true,"rt":4199},{"word":"donor","correct":true,"rt":695},{"word":"penguin","correct":true,"rt":518},{"word":"suburb","correct":false,"rt":6440},{"word":"goddess","correct":false,"rt":560},{"word":"penguin","correct":false,"rt":1024},{"word":"pig","correct":true,"rt":520},{"word":"parrot","correct":true,"rt":328},{"word":"donor","correct":true,"rt":564},{"word":"goddess","correct":false,"rt":535},{"word":"suburb","correct":false,"rt":6611},{"word":"parrot","correct":true,"rt":663},{"word":"donor","correct":true,"rt":645},{"word":"pig","correct":false,"rt":721},{"word":"penguin","correct":true,"rt":488}]
    all_pairs = [{"word":"donor","image":"../static/stimuli/images/subway/sun_apsbdxitmzdgpeyn.jpg"},{"word":"goddess","image":"../static/stimuli/images/laundryroom/sun_amdxqjichaqshdel.jpg"},{"word":"suburb","image":"../static/stimuli/images/auditorium/sun_ahcmaddzrcfxzuuz.jpg"},{"word":"penguin","image":"../static/stimuli/images/volcano/sun_aacjsxcwmkbgvpmb.jpg"},{"word":"pig","image":"../static/stimuli/images/pool/sun_alkvkavnnunmdavq.jpg"},{"word":"parrot","image":"../static/stimuli/images/temple/sun_ahuwbjbhgegvnlsq.jpg"}]
    PARAMS.n_pair = 3
    searchParams.set('skip', 6)
  }

  // let afc_bonus = (PARAMS.bonus_rate_afc + PARAMS.bonus_rate_speed) * PARAMS.n_pair * 2 * PARAMS.n_repeat
  let pretest_bonus = (PARAMS.bonus_rate_pretest + PARAMS.bonus_rate_speed) * PARAMS.n_pair * 2 * (1+PARAMS.n_repeat)
  let distractor_bonus = PARAMS.bonus_rate_distractor * PARAMS.n_distractor
  let n_critical = (PARAMS.critical_type == 'simple-recall' ? PARAMS.n_pair * 2 : PARAMS.n_pair) - PARAMS.n_practice_critical
  let critical_bonus = (PARAMS.bonus_rate_critical + PARAMS.bonus_rate_speed) * n_critical
  let max_bonus = pretest_bonus + distractor_bonus + critical_bonus
  
  let welcome_block = button_trial(`
    # Welcome 😃

    In this experiment, you will play a memory game where you learn pairings
    between images and words. We will alternate between showing you the pairs
    and quizing you on them in different ways. To make things more fun, we 
    will pay you a bonus based on how well you remember the pairs.
    The maximum bonus is $${(max_bonus / 100).toFixed(2)}!
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

  function make_afc_pairs() {
    return _.chain(all_pairs)
      .shuffle()
      .map(({image, word}, i, arr) => ({
        word: word,
        target_image: image,
        lure_images: [arr[(i+1) % arr.length].image],
      }))
      .shuffle()
      .value()
  }

  function make_afc_block(block_i) {
    let intro = button_trial(`
      # Test (${block_i+1} / ${PARAMS.n_repeat})

      Now we'll see how well you've learned the pairs. On each round,
      you will see a word and two images. ${PARAMS.afc_time == null ? `
        Try to select the image that goes with the word.
      ` : `
        Then you'll have ${PARAMS.afc_time / 1000} seconds to select the image that goes with the word.
      `}

      You will earn ${fmt_cents(PARAMS.bonus_rate_afc)} for each
      correct answer. You will also receive a small extra bonus for answering
      quickly (and correctly), so try to respond as fast as you can
      (while staying accurate)!

      To make things harder, we won't tell you which
      ones were correct! 😉
    ` + ((block_i == 0) ? "We'll start with a practice round." : ""))


    let timeline = make_afc_pairs()
    
    // Specialize by number
    if (block_i == 0) {
      timeline[0].practice = true
    } else if (block_i == PARAMS.n_repeat - 1) {
      timeline = timeline.concat(make_afc_pairs())
    }
    var n_correct = 0
    var time_bonus = 0
    let block = {
      type: 'afc',
      max_time: PARAMS.afc_time,
      bonus_rate: PARAMS.bonus_rate_afc,
      timeline,
      on_finish: data => {
        let {correct, rt} = data
        PRETEST_LOG.push({word: data.trial.word, correct, rt})
        console.log("PRETEST_LOG", PRETEST_LOG)
        n_correct += data.correct
        if (data.correct) {
          let prop_left = (PARAMS.afc_bonus_time - data.rt) / PARAMS.afc_bonus_time
          time_bonus += prop_left * PARAMS.bonus_rate_speed
        }
        data.block = block_i + 1
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

  function make_simple_block(block_i, double=false) {
    let intro = button_trial(`
      # Test (${block_i+1} / ${PARAMS.n_repeat})

      Now we'll see how well you've learned the pairs. 
      On each round, we will display one of the pictures you saw before and
      you'll have ${PARAMS.recall_time / 1000} seconds to type in the word that
      was paired with the image.

      You will earn ${fmt_cents(PARAMS.bonus_rate_pretest)} for each
      correct answer. You will also receive a small extra bonus for answering
      quickly (and correctly), so try to respond as fast as you can
      (while staying accurate)!

      If you don't remember the word for the image, you can just leave
      the text box blank and hit enter. There's no penalty for guessing though!
    ` + ((block_i == 0) ? "We'll start with a practice round." : ""))
    
      // However, to make things harder, we won't tell you which
      // ones were correct! 😉

    let timeline = _.shuffle(pairs.low.concat(pairs.high))
    timeline = JSON.parse(JSON.stringify(timeline))  // deep clone b/c mutation below
    
    if (double) {
      timeline = timeline.concat(_.shuffle(timeline))
    }
    if (block_i == 0) {
      timeline[0].practice = true
    } 
    // else if (block_i == PARAMS.n_repeat - 1) {
      // timeline = timeline.concat(_.shuffle(pairs.low.concat(pairs.high)))
    // }
    var n_correct = 0
    var time_bonus = 0
    let block = {
      type: 'simple-recall',
      feedback: false,
      max_time: PARAMS.afc_time,
      bonus: PARAMS.bonus_rate_pretest,
      recall_time: PARAMS.recall_time,
      timeline,
      on_finish: data => {
        let {correct, rt} = data
        PRETEST_LOG.push({word: data.trial.word, correct, rt})
        // console.log("PRETEST_LOG", PRETEST_LOG)
        n_correct += data.correct
        if (data.correct) {
          let prop_left = (PARAMS.recall_time - data.rt) / PARAMS.recall_time
          if (prop_left < 0) {
            console.log(`WARNING: prop_left = ${prop_left}`)
            prop_left = 0
          }
          time_bonus += prop_left * PARAMS.bonus_rate_speed
        }
        // console.log('time_bonus = ', time_bonus)
        data.block = block_i + 1
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

  let make_test_block = {
    'afc': make_afc_block,
    'simple-recall': make_simple_block
  }[PARAMS.pretest_type]

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

  assert(PARAMS.bonus_rate_critical_speed == 0.1)

  let [show_left, show_right, choose_left, choose_right] = MULTI_KEYS
  let type_instruct = {
    'simple-recall': `
      On each round, we will display one of the pictures you saw before and
      you'll have ${PARAMS.recall_time / 1000} seconds to type in the word that
      was paired with the image. You will earn ${PARAMS.bonus_rate_critical} cents
      for every correct response. But you will lose
      ${PARAMS.bonus_rate_critical} cents for every *incorrect* response. **There is
      no penalty for leaving the text box blank.**

      Additionally, you will earn a tenth of a cent for each second left on the timer
      when you respond. **You still earn this bonus for empty responses, but not
      for incorrect responses**. If you don't remember the word, it might be best
      to give up quickly (leaving the text box empty) so that you can get the time
      bonus. It is *not* a good idea to guess, unless you are pretty sure
      that you remembered the right word.

      The first ${PARAMS.n_practice_critical} rounds are practice,
      and don't count towards your bonus.
    `,
    'multi-recall': `
      On each round, you will be shown two images and you have to remember the
      word associated with _one_ of them. We will only display one image at a
      time, but you can switch between them using the ${show_left} and
      ${show_right} keys. As soon as you remember one of the words, press
      ${choose_left} (for the left image) or ${choose_right} (for the right
      image). Then type the word into the text box that appears and press
      enter again to submit.
    `,
    'multi-recall-flip': `
      On each round, you will be shown two images and you have to remember the
      word associated with _one_ of them. We will only display one image at a
      time, but you can switch between them using the space bar. As soon as
      you remember one of the words, make sure the associated image is on the
      screen and press enter. Then type the word into the text box that
      appears and press enter again to submit.
    `
  }[PARAMS.critical_type]

  let critical_instruct = button_trial(`
    # Final test

    You're almost done! In this last section, we will test your knowledge one
    more time. But it will be a little different this time. ${type_instruct}
    
    You will earn a higher bonus on these rounds,
    ${PARAMS.bonus_rate_critical} cents for each correct response. You'll 
    get a small additional bonus for responding quickly like before.
    We'll start with a practice round. 
  `, {
    // Like before, you will earn a little extra money for responding quickly,
    // so try to be as fast as you can while maintaining accuracy!
    on_finish() {
      if (PARAMS.critical_type == 'multi-recall') {
        console.log('building critical trials')
        // console.log(JSON.stringify(AFC_LOG))
        // console.log(JSON.stringify(all_pairs))
        // build the critical trials
        let scores = _.chain(PRETEST_LOG)
        .groupBy("word")
        .mapObject(record => 
          mean(record.map(({correct, rt}) => {
            PARAMS.fancy_critical ? Math.log(rt) : 0
          }))
        )
        .value()
        // console.log(scores)
        psiturk.recordUnstructuredData('afc_scores', scores)
        // console.log('scores', scores)

        let sorted_pairs = _.sortBy(all_pairs, ({word}) => scores[word])
        // console.log(sorted_pairs)

        CRITICAL_PAIRS = _.zip(
          sorted_pairs.slice(0, PARAMS.n_pair),
          sorted_pairs.slice(PARAMS.n_pair).reverse()
        )
        psiturk.recordUnstructuredData('critical_pairs', CRITICAL_PAIRS)
        // console.log('CRITICAL_PAIRS', CRITICAL_PAIRS)
      }
    }
  })

  function critical_timeline() {
    if (PARAMS.critical_type == 'simple-recall') {
      let timeline = _.shuffle(pairs.low.concat(pairs.high))
      for (let i of _.range(PARAMS.n_practice_critical)) {
        timeline[i].practice = true
      }
      return timeline
    } else {
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

  var critical_time_bonus = 0
  let critical_block = {
    type: `${PARAMS.critical_type}`,
    bonus: PARAMS.bonus_rate_critical,
    // time_bonus: PARAMS.bonus_rate_critical_speed,
    recall_time: PARAMS.recall_time,
    timeline: critical_timeline(),
    on_finish(data) {
      console.log("ON FINISH")
      let x = _.last(data.events)
      if (x.event == "response" && x.word == x.response) {
        let rt = x.time - data.events[0].time
        let prop_left = (PARAMS.recall_time - rt) / PARAMS.recall_time
        prop_left = Math.max(0, prop_left)
        critical_time_bonus += prop_left * PARAMS.bonus_rate_speed
      }
    },
  }

  let debrief = {
    type: 'survey-text',
    preamble: () => {
      BONUS += Math.ceil(critical_time_bonus)
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
    practice: true,
    bonus: PARAMS.bonus_rate_critical,
    recall_time: PARAMS.recall_time,
    options: [{"word":"rouge","image":"../static/stimuli/images/pool/sun_antxeexzhaspkvlj.jpg"},{"word":"antelope","image":"../static/stimuli/images/river/sun_aiazxjumlgdcrfpn.jpg"}]
  }

  let timeline = [  // = timeline =
    // test_multi,
    welcome_block,
    make_train_block(0),
    make_test_block(0),
    make_train_block(1),
    distractor,
    make_test_block(1, true),
    critical_instruct,
    critical_block,
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



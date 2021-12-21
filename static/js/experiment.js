const PARAMS = { // = PARAMS =
  pretest_type: 'simple-recall',
  critical_type: 'simple-recall-penalized',
  overlay: true,
  fancy_critical: false,  

  train_presentation_duration: 2000,
  recall_time: 15000,
  afc_time: null,
  afc_bonus_time: 5000,
  
  n_pair: 40,
  n_repeat: 2,
  n_practice_critical: 3,
  n_distractor: 10,

  bonus_rate_critical: 3,
  bonus_rate_critical_speed: 1/10,
  bonus_rate_afc: 1,
  bonus_rate_pretest: 1,
  bonus_rate_distractor: 1,
  bonus_rate_speed: 0.25,

  prime: true,
  prime_duration: 100,
  prime_mask: false,
  prime_mask_surround: false,
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
PRIMES = undefined

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
  PRIMES = await $.getJSON('static/stimuli/primes.json')
  let images = _.sample(Object.values(stimuli.images).map(_.sample), PARAMS.n_pair)
  
  // let words = _.sample(stimuli.words, PARAMS.n_pair)
  let words = _.sample(Object.keys(PRIMES.primes), PARAMS.n_pair)

  let pairs = _.zip(words, images).map(([word, image]) => ({word, image}))
  console.log(pairs)
  psiturk.recordUnstructuredData('pairs', pairs)

  jsPsych.pluginAPI.preloadImages(images);
  // psiturk.preloadImages(images);

  if (searchParams.get('debug_multi', false)) {
    AFC_LOG = [{"word":"pig","correct":false,"rt":6006},{"word":"goddess","correct":false,"rt":458},{"word":"parrot","correct":true,"rt":214},{"word":"suburb","correct":true,"rt":4199},{"word":"donor","correct":true,"rt":695},{"word":"penguin","correct":true,"rt":518},{"word":"suburb","correct":false,"rt":6440},{"word":"goddess","correct":false,"rt":560},{"word":"penguin","correct":false,"rt":1024},{"word":"pig","correct":true,"rt":520},{"word":"parrot","correct":true,"rt":328},{"word":"donor","correct":true,"rt":564},{"word":"goddess","correct":false,"rt":535},{"word":"suburb","correct":false,"rt":6611},{"word":"parrot","correct":true,"rt":663},{"word":"donor","correct":true,"rt":645},{"word":"pig","correct":false,"rt":721},{"word":"penguin","correct":true,"rt":488}]
    pairs = [{"word":"donor","image":"../static/stimuli/images/subway/sun_apsbdxitmzdgpeyn.jpg"},{"word":"goddess","image":"../static/stimuli/images/laundryroom/sun_amdxqjichaqshdel.jpg"},{"word":"suburb","image":"../static/stimuli/images/auditorium/sun_ahcmaddzrcfxzuuz.jpg"},{"word":"penguin","image":"../static/stimuli/images/volcano/sun_aacjsxcwmkbgvpmb.jpg"},{"word":"pig","image":"../static/stimuli/images/pool/sun_alkvkavnnunmdavq.jpg"},{"word":"parrot","image":"../static/stimuli/images/temple/sun_ahuwbjbhgegvnlsq.jpg"}]
    PARAMS.n_pair = 3
    searchParams.set('skip', 6)
  }

  // let afc_bonus = (PARAMS.bonus_rate_afc + PARAMS.bonus_rate_speed) * PARAMS.n_pair * 2 * PARAMS.n_repeat
  let pretest_bonus = (PARAMS.bonus_rate_pretest + PARAMS.bonus_rate_speed) * PARAMS.n_pair * (1+PARAMS.n_repeat)
  let distractor_bonus = PARAMS.bonus_rate_distractor * PARAMS.n_distractor
  let n_critical = PARAMS.n_pair - PARAMS.n_practice_critical
  let critical_bonus = (PARAMS.bonus_rate_critical + PARAMS.bonus_rate_critical_speed * PARAMS.recall_time/1000) * n_critical
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

  let train_trials = pairs.map(({image, word}) => {
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
      # Training

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

  function make_test_block(block_i, args) {
    let {double, feedback} = _.defaults(args, {double: false, feedback:'none'})

    let intro = button_trial(`
      # Test

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

    let timeline = _.shuffle(pairs)
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
      max_time: PARAMS.afc_time,
      bonus: PARAMS.bonus_rate_pretest,
      recall_time: PARAMS.recall_time,
      timeline,
      feedback,
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
    
    let summary = button_trial(() => {
      saveData()
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
    return {timeline: [intro, block, summary]}
  }

  let distractor_intro = button_trial(`
    # Math challenge

    Before continuing to the memory test, you can earn some extra bonus
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

  // let critical_instruct = button_trial(`
  //   # Final test

  //   You're almost done! In this final test round, you will have to guess
  //   the words like before, but we've raised the stakes. This time, you'll
  //   earn ${PARAMS.bonus_rate_critical} cents for every correct response.
  //   But you'll _lose_ ${PARAMS.bonus_rate_critical} cents for every
  //   _incorrect_ response. We've also raised the speed bonus to a tenth of a
  //   cent for each second left on the timer when you respond.

  //   **Take note!** If you don't know the word, you can leave the text box
  //   empty, and you'll still get the time bonus. If you give an incorrect
  //   response, you give up the bonus. So, if you don't think you know
  //   the word, it might be best to give up quickly to get the time bonus and
  //   avoid the error penalty.

  //   Before we start, please 
  // `, {
  // })

  let critical_instruct = {
    type: 'custom',
    func: async function (stage) {
      $('<div>')
      .html(markdown(`
        # Final test

        You're almost done! In this final test round, you will have to guess
        the words like before, but we've raised the stakes. This time, you'll
        earn ${PARAMS.bonus_rate_critical} cents for every correct response.
        But you'll _lose_ ${PARAMS.bonus_rate_critical} cents for every
        _incorrect_ response. You can _skip_ a round by pressing enter without
        typing anything in the text box. _There is no penalty for skipping._

        We've also raised the speed bonus to a tenth of a cent for each second
        left on the timer when you respond. And, unlike before, you will earn
        the bonus even if you don't give a correct response. So if you don't
        think you know the word, it might be best to quickly skip the trial to get
        the time bonus and avoid the error penalty.

        ## Quiz
      `))
      .appendTo(stage)

      var questions = [
        'You pay a penalty if you enter an incorrect word.',
        'You pay a penalty if you leave the text box empty.',
        'You only earn money for responding quickly if you give a correct response.',
      ]
      var radios = questions.map(q => make_radio(stage, q, ['True', 'False']))
      radios.push(make_radio(stage, "If you don't know the word you should...", [
        'guess a random word', 'wait until the timer runs out', 'skip the trial'
      ]))
      radios.push(make_radio(stage, "How do you skip a trial?", [
        'write "skip" and press enter', 'press enter when the text box is empty'
      ]))
      var correct = ['True', 'False', 'False', 'skip the trial', 'press enter when the text box is empty']
      var n_try = 0
    
      let btn = $('<button>', {class: 'btn btn-primary center'})
      .text('Submit')
      .appendTo($('<div>').css('text-align', 'center').appendTo(stage))

      while (true) {
        await new Promise(resolve => btn.click(resolve))
        n_try += 1
        console.log(radios.map((r, i) => r()))
        let all_good = _.all(radios.map((r, i) => r() == correct[i]))
        if (all_good) {
          return {'critical_quiz': n_try}
        } else {
          alert("You answered at least one question wrong. Please try again.")
        }
      }
    }
  }
  let critical_instruct2 = button_trial(`
    # One more thing

    After each round, we will ask a question about how well you remember the
    word for the image on that round. If you gave a response, we will ask how
    confident you are that you entered the correct word. If you skipped the
    trial, you might still have the feeling that you knew the word, so we will
    ask how much you felt that you knew the word.`)

  function critical_timeline() {
    let timeline = _.shuffle(pairs)
    for (let i of _.range(PARAMS.n_practice_critical)) {
      timeline[i].practice = true
    }
    return timeline
  }

  var critical_time_bonus = 0
  let critical_block = {
    type: `${PARAMS.critical_type}`,
    bonus: PARAMS.bonus_rate_critical,
    prime: PARAMS.prime,
    time_bonus: PARAMS.bonus_rate_critical_speed,
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

        <b>Please make sure to answer the first question!</b>
      `)
    },
    questions: [
      'Did you notice anything about the letters that flashed in the last test round?',
      'Were the instructions confusing, hard to understand, or too long?',
      'Was the interface at all difficult to use?',
      'Did you experience any technical problems (e.g., images not displaying)?',
      'Any other comments?',
    ].map(prompt => ({prompt, rows: 2, columns: 70}))
  }

  let timeline = [  // = timeline =
    welcome_block,
    make_train_block(0),
    // make_test_block(0),
    // make_train_block(1),
    distractor,
    make_test_block(1, {double: true, feedback: "none"}),
    critical_instruct,
    critical_instruct2,
    critical_block,
    debrief,
  ];

  if (searchParams.get('multi')) timeline[0] = test_multi

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



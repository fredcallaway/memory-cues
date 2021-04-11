/*
 * Example plugin template
 */

var MULTI_KEYS = ['J', 'K', 'D', 'F'];
jsPsych.plugins["multi-recall"] = (function() {

  var SIZE = 300;
  let [show_left, show_right, choose_left, choose_right] = MULTI_KEYS
  // var MULTI_KEYS = ['D', 'F', 'J', 'K', ];

  var plugin = {};
  
  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = async function(display_element, trial) {
    jsPsych.pluginAPI.cancelAllKeyboardResponses()
    let display = $(display_element);

    if (typeof trial.options === 'function') {
      trial.options = trial.options.call();
    }
    let {options, recall_time, bonus, practice=false} = trial;

    console.log('multi-recall', options)

    if (trial.practice) {
      $('<div>')
      .html(markdown(`
        # Practice trial

        - Press **${show_left}** to show the left image. Press **${show_right}** to show the right image.
        - A timer will start as soon as you show one of the images. Normally
          you'll have ${recall_time/1000} seconds to respond. But for this
          practice round we'll give you 30 seconds.
        - You can flip back and forth as many times as you like. 
        - **For this practice round, please show each image twice!**
        - If you remember the word for the left image, press
          **${choose_left}**. For the right image, press **${choose_right}**.
        - A text box will appear. Type in the word that was paired with the image you chose.
        - Hit enter/return to submit your response. Make sure to respond before the timer hits zero!
      `))
      .appendTo(display);
      recall_time = 30000
    }

    let data = {
      trial,
      events: []
    };
    let start_time = performance.now();

    function log(event, info) {
      console.log(event, info)
      data.events.push({
        time: performance.now() - start_time,
        event,
        ...info
      });
    }

    let stage = $('<div>')
    .css('text-align', 'center')
    .css('margin-top', 40)
    .appendTo(display)

    function showFeedback() {
      stage.empty()
      let fb = $('<div>')
      .css('font-size', '32pt')
      .css('font-weight', 'bold')
      .css('margin-top', 120)
      .appendTo(stage)

      sleep(1500)
      .then(()=> {
        display.empty()
        jsPsych.finishTrial(data)
      })
      return fb
    }
    let displays = options.map(({word, image}) => {
      let block = $('<div>')
      .css({
          float: 'left',
          'margin-left': 63,
          'margin-right': 63,
          'margin-bottom': 30,
      })
      .appendTo(stage);
      
      let mask = $('<div>')
      .css({
          width: SIZE,
          height: SIZE,
          background: 'gray'
      })
      .appendTo(block);
      
      let img = $('<img>', {
        src: image,
        // height: SIZE,
        // width: SIZE,
      })
      .hide()
      .appendTo(block);

      return {
        block, mask, img,
        show() {
          mask.hide()
          img.show()
        },
        hide() {
          mask.show()
          img.hide()
        }
      }
    })
  
    var complete = false
    let timer_container = $('<div>').css('margin-top', 20).appendTo(stage)
    let timer = null
    function startTimer() {
      timer = makeTimer(recall_time / 1000, timer_container)
      timer.then(() => {
        if (!complete) {
          complete = true
          log('timeout')
          showFeedback().text('Timeout').css('color', '#b00')
        }
      })
    }

    // flip between images with key presses
    let choice = null
    while (choice == null) {
      let {key} = await getKeyPress(MULTI_KEYS)
      console.log({key})
      if (timer == null) startTimer();
      if (complete) return;     // trial is already over
      switch (key) {
        case show_left:
          log('show', {option: 0})
          displays[0].show()
          displays[1].hide()
          break
        case show_right:
          log('show', {option: 1})
          displays[1].show()
          displays[0].hide()
          break
        case choose_left:
          log('choose', {option: 0})
          choice = 0
          break
        case choose_right:
          log('choose', {option: 1})
          choice = 1
          break
      }
    }

    displays[choice].block
    .css({
      'outline': '10px solid #FFDD47',
      'outline-offset': '-10px' //keeping it inside
    })

    // displays[0 + !choice].hide()
    // displays[choice].show()
    // await sleep(1000)

    displays[0].hide()
    displays[1].hide()

    log('begin response')
    await sleep(30)

    let {word} = options[choice]
    let input_div = $('<div/>')
    // .appendTo(displays.block)
    .appendTo(stage)
    let input = $('<input />')
    .css({
      'margin-top': 20,
      width: SIZE - 40
    })
    .appendTo(input_div)
    .focus()
    .keydown(function(event) {
      log('type', {input: input.val(), key: event.key, keyCode: event.keyCode});
    })

    await getKeyPress(['enter'])
    let response = input.val();
    complete = true
    log('response', {word, response});

    if (response == word || practice) {
      BONUS += bonus
    }

    if (response == word) {
      showFeedback().text(`Correct! +${bonus}¢`).css('color', '#080')
    } else {
      showFeedback().text('Incorrect').css('color', '#b00')
    }
  };

  return plugin;
})();

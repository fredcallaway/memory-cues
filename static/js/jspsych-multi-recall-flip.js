/*
 * Example plugin template
 */

jsPsych.plugins["multi-recall-flip"] = (function() {

  var SIZE = 300;

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

        - Press space. The first image will appear.
        - Press space again to show the second image.
        - You can continue to flip back and forth between the images as long as you like.
        - As soon as you remember one of the words, press enter/return while its image is on the screen.
        - A text box will appear. Type in the word that was paired with the on-screen image.
        - Hit enter/return to submit your response.
        - Make sure to respond before the timer hits zero!
        - Normally you'll have ${recall_time/1000} seconds to respond. But for this practice round we'll give
          you 30 seconds.
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

    let space = $('<div>')
    .css('margin-top', 140)
    .text('press space when ready')
    .appendTo(stage)

    await getKeyPress(['space'])
    await sleep()  // this prevents the space from being logged as a key press
    space.remove()
    var visible = 0
    log('show', {visible})

    let images = $('<div>').appendTo(stage)
    let img1 = $('<img>', {
      src: options[0].image,
      // height: SIZE,
      // width: SIZE,
    })
    .appendTo(images)
    
    let img2 = $('<img>', {
      src: options[1].image,
      // height: SIZE,
      // width: SIZE,
    })
    .appendTo(images)
    .hide()

    var complete = false
    let timer_container = $('<div>').css('margin-top', 20).appendTo(stage)
    let timer = makeTimer(recall_time / 1000, timer_container)
    timer.then(() => {
      if (!complete) {
        complete = true
        log('timeout')
        showFeedback().text('Timeout').css('color', '#b00')
      }
    })

    // alternate viewing each image
    while (true) {
      let {key} = await getKeyPress(['space', 'enter'])
      if (complete) return  // trial is already over
      if (key == 'space') {
        visible = (visible + 1) % 2
        log('switch', {visible})
        img1.toggle(); img2.toggle()
      } else {
        log('begin response')
        await sleep(30)
        break
      }
    }
    images.empty()
    let mask = $('<div>')
    .css({
        width: SIZE,
        height: SIZE,
        margin: 'auto',
        background: 'gray'
    })
    .appendTo(images);


    // get response for currently visible image
    let {word} = options[visible]
    let input_div = $('<div/>')
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

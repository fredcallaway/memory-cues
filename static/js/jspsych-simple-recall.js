/*
 * Example plugin template
 */

jsPsych.plugins["simple-recall"] = (function() {

  var SIZE = 300;

  var plugin = {};
  
  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = async function(display_element, trial) {
    // console.log('begin simple-recall trial', trial)
    let display = $(display_element);
    let {word, image, practice, bonus, idx, recall_time} = trial;

    let header = practice ?
    `
      ### Practice round

      - Hit space. An image, text box, and timer will appear.
      - Type the word that was paired with the image into the text box.
      - Hit enter to submit your response.
      - Make sure to respond before the timer hits zero!
    ` : `
      ### Round ${idx+1}/${PARAMS.n_pair * 2 - 1}

      #### Current bonus: $${(BONUS / 100).toFixed(2)}
    `
    $('<div>')
    .html(markdown(header))
    .appendTo(display);

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

    function showFeedback(text) {
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

    function finishTrial() {
    }

    let space = $('<div>')
    .css('margin-top', 140)
    .text('press space when ready')
    .appendTo(stage)

    await getKeyPress(['space'])
    await sleep()  // this prevents the space from being logged as a key press

    log('show image')
    space.remove()
    let img = $('<img>', {
      src: image,
      // height: SIZE,
      // width: SIZE,
    })
    .appendTo(stage);

    // await getKeyPress(['space'])
    log('begin response')
    let input_div = $('<div/>').appendTo(stage);

    // INPUT
    let input = $('<input />')
    .css({
      'margin-top': 30,
      width: SIZE - 40
    })
    .appendTo(input_div)
    .focus()
    .keydown(function(event) {
      let key = event.keyCode || event.charCode;
      if( key == 8 || key == 46 ) {
          log('backspace')
      }
    })
    .keypress(function(event) {
      console.log(event.key)
      log('type', {key: event.key, input: input.val()});
      if (event.keyCode == 13 || event.which == 13) {  // press enter

        let response = input.val().trim().toLowerCase();
        log('response', {word, response});

        if (response == word || practice) {
          BONUS += bonus
        }

        if (response == word) {
          showFeedback().text(`Correct! +${bonus}¢`).css('color', '#080')
        } else {
          showFeedback().text('Incorrect').css('color', '#b00')
        }
      }
    });

    // TIMER
    let timer = makeTimer(recall_time / 1000, stage)
    timer.then(() => {
      log('timeout')
      showFeedback().text('Timeout').css('color', '#b00')
    })

    
  } // plugin.trial

  return plugin;
})();

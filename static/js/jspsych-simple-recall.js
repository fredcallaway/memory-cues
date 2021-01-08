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
    let {word, image, practice, bonus, idx} = trial;

    let header = practice ?
    `
      ### Practice round

      - Hit space. An image will appear.
      - As soon as you remember the word for this image, press space again.
      - Type the word into the text box and hit enter.
    ` : `
      ### Round ${idx+1}/19

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
      data.events.push({
        time: performance.now() - start_time,
        event,
        ...info
      });
    }

    let stage = $('<div>')
    .css({
      'text-align': 'center',
    })
    .appendTo(display)

    let space = $('<div>')
    .css('margin-top', 120)
    .text('press space when ready')
    .appendTo(stage)

    await getKeyPress(['space'])
    log('show image')
    space.remove()
    let img = $('<img>', {
      src: image,
      // height: SIZE,
      // width: SIZE,
    })
    .appendTo(stage);

    await getKeyPress(['space'])
    log('begin response')
    let input_div = $('<div/>').appendTo(stage);
    let input = $('<input />')
    .css({
      'margin-top': 30,
      width: SIZE - 40
    })
    .appendTo(input_div)
    .focus()
    .keypress(function(event) {
      log('type', {input: input.val()});
      if (event.keyCode == 13 || event.which == 13) {
        let response = input.val().trim().toLowerCase();
        log('response', {word, response});
        console.log(data);
        stage.empty()

        let fb = $('<div>')
        .css('font-size', '32pt')
        .css('font-weight', 'bold')
        .css('margin-top', 120)
        .appendTo(stage)
          
        if (response == word) {
          fb.text(`Correct! +${bonus}¢`).css('color', '#080')
        } else {
          fb.text('Incorrect').css('color', '#b00')
        }

        if (response == word || practice) {
          BONUS += bonus
        }

        sleep(1000)
        .then(()=> {
          display.empty()
          jsPsych.finishTrial(data)
        })
      }
    });
    
  } // plugin.trial

  return plugin;
})();

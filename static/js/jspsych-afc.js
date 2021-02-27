/*
 * Example plugin template
 */

var AFC_LOG = [];

jsPsych.plugins["afc"] = (function() {

  var SIZE = 300;

  var plugin = {};
  
  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = async function(display_element, trial) {
    console.log('begin simple-recall trial', trial)
    let display = $(display_element);
    let {word, target_image, distractor_images, max_time} = trial;

    // let header = practice ?
    // `
    //   ### Practice round

    //   TODO
    // ` : `
    //   ### Round ${idx+1}/${PARAMS.n_pair * 2 - 1}

    //   #### Current bonus: $${(BONUS / 100).toFixed(2)}
    // `
    // $('<div>')
    // .html(markdown(header))
    // .appendTo(display);

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

    let btn = $('<button>')
    .text('start')
    .css('margin-top', 170)
    .appendTo(stage)
    await new Promise(resolve => btn.click(resolve))
    stage.empty()

    // let space = $('<div>')
    // .css('margin-top', 140)
    // .text('press space when ready')
    // .appendTo(stage)
    // await getKeyPress(['space'])
    // space.remove()
    // await sleep()  // this prevents the space from being logged as a key press

    log('show word')
    let h2 = $('<h2>')
    // .css('font-size', '20pt')
    .text(word)
    .appendTo(stage)

    let show_time = performance.now()
    let img_container = $('<div>')
    .css('margin', '20px 0px 50px')
    .appendTo(stage)
    let all_imgs = distractor_images.concat([target_image])
    console.log(distractor_images, [target_image])
    all_imgs.forEach(img => {
      console.log(img)
      $('<img>', {src: img, width: SIZE, height: SIZE})
      .css('margin', '20px')
      .appendTo(img_container)
      .click(() => {
        let correct = img == target_image
        let rt = performance.now() - show_time
        log('respond', {word, img, correct, rt})
        AFC_LOG.push({word, correct, rt})
        display.empty()
        jsPsych.finishTrial(data)
      })
    })

    // TIMER
    let timer = makeTimer(max_time / 1000, stage)
    timer.then(() => {
      if (!responded) {
        log('timeout')
        showFeedback().text('Timeout').css('color', '#b00')
      }
    })

    
  } // plugin.trial

  return plugin;
})();

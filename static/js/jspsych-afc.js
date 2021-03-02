/*
 * Example plugin template
 */

var AFC_LOG = []

jsPsych.plugins["afc"] = (function() {

  var SIZE = 300

  var plugin = {}
  
  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = async function(display_element, trial) {
    console.log('begin simple-recall trial', trial)
    let display = $(display_element);
    let {word, target_image, lure_images, max_time=null, practice=false} = trial;

    let header = ""
    if (practice) {
      header += `
        ### Practice round

        - Hit space. A word and two images will appear.
        - Press the key (**F** or **J**) associated with the image that was paired with the given word.
        
      `
      if (max_time != null) {
        header += `
          - Make sure to respond before the timer hits zero!
          - Normally you'll have ${max_time/1000} seconds to respond. But for this practice round we'll give
            you 30 seconds.
        `
      }
    }
    // ### Round ${idx+1}/${PARAMS.n_pair * 2 - 1}
    // #### Current bonus: $${(BONUS / 100).toFixed(2)}
    $('<div>')
    .html(markdown(header))
    .appendTo(display);

    if (max_time != null && practice) max_time = 30000

    let data = {
      trial,
      events: [],
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
    space.remove()
    await sleep(30)  // this prevents the space from being logged as a key press

    log('show word')
    let h2 = $('<h1>')
    // .css('font-size', '20pt')
    .text(word)
    .appendTo(stage)

    // display images
    let img_container = $('<div>')
    .css('margin', '20px 0px 50px')
    .css('display', 'flex')
    .appendTo(stage)

    let keys = ['F', 'J'] 
    let all_imgs = _.shuffle(lure_images.concat([target_image]))
    let key2img = {}
    _.zip(keys, all_imgs).forEach(([key, img]) => {
      let div = $('<div>')
      // .css('float', 'left')
      .css('margin', 'auto')
      .appendTo(img_container)
      
      $('<img>', {id: `img-${key}`, src: img, width: SIZE, height: SIZE})
      .css('margin', '20px')
      .appendTo(div)
      
      $('<h3>').text(key).appendTo(div)
      key2img[key] = img
    })

    var responded = false
    if (max_time != null) {
      let timer = makeTimer(max_time / 1000, $("<div>").appendTo(stage))
      timer.then(() => {
        if (!responded) {
          jsPsych.pluginAPI.cancelAllKeyboardResponses()
          log('timeout')
          data.correct = false
          showFeedback().text('Timeout').css('color', '#b00')
        }
      })
    }

    let {key, rt} = await getKeyPress(keys)
    responded = true
    $(`#img-${key}`)
    .css({
      'outline': '10px solid #FFDD47',
      'outline-offset': '-10px' //keeping it inside
    })
    $('.timer').remove()
    let response = key2img[key]
    let correct = response == target_image
    if (correct || practice) BONUS += 1
    log('response', {response, key})
    AFC_LOG.push({word, correct, rt})
    await sleep(1000)
    display.empty()
    data.correct = correct
    data.rt = rt
    jsPsych.finishTrial(data)
    
  } // plugin.trial

  return plugin;
})();

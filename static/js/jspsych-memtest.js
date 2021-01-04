/*
 * Example plugin template
 */

jsPsych.plugins["memtest"] = (function() {

  var SIZE = 300;

  var plugin = {};
  
  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = function(display_element, trial) {

    let {options} = trial;
    let stage = $(display_element);

    let clicked = false;
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

    options.forEach(({word, image}) => {

      let block = $('<div>')
      .css({
          float: 'left',
          margin: 40
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
        width: SIZE,
      })
      .hide()
      .appendTo(block);
      
      block
      .mouseenter(() => {
        if (clicked) return;
        log('enter', {word});
        mask.hide();
        img.show();
      })
      .mouseleave(() => {
        if (clicked) return;
        log('exit', {word});
        mask.show();
        img.hide();
      })
      .click(() => {
        if (clicked) return;
        log('click', {word});
        clicked = true;
        let input_div = $('<div/>').appendTo(display_element);
        let input = $('<input />')
        .css({
          width: SIZE - 40
        })
        .appendTo(input_div)
        .focus()
        .keypress(function(event) {
          log('type', {input: input.val()});
          if (event.keyCode == 13 || event.which == 13) {
            let response = input.val();
            log('response', {word, response});
            console.log(data);
            jsPsych.finishTrial(data);
          }
        });
      });
    });
  };

  return plugin;
})();

  /*
   * Example plugin template
   */

  jsPsych.plugins["simple-recall-penalized"] = (function() {

    var SIZE = 300;

    var plugin = {};
    var timer
    
    plugin.info = {
      name: "PLUGIN-NAME",
      parameters: {}
    };

    plugin.trial = async function(display_element, trial) {
      // console.log('begin simple-recall trial', trial)
      let display = $(display_element);
      let {word, image, practice=false, time_bonus=0, bonus, recall_time} = trial;

      let header = practice ?
      `
        ### Practice round

        - Hit space. An image, text box, and timer will appear.
        - If you remember the word, type it into the text box. Otherwise, leave it blank.
        - Hit enter to submit your response.
      ` : ` `
        // ### Round ${idx+1}/${PARAMS.n_pair * 2 - 1}

        // #### Current bonus: $${(BONUS / 100).toFixed(2)}
      $('<div>')
      .html(markdown(header))
      .appendTo(display);

      let data = {
        trial,
        events: []
      };
      let start_time = performance.now();

      function add_bonus(bonus) {
        if (!practice) {
          BONUS += bonus
        }
      }

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
      var responded = false
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
          responded = true  // disable timeout
          let response = input.val().trim().toLowerCase();
          log('response', {response});

          let feedback = $('<div>')
          let error = false

          if (response == word) {
            add_bonus(bonus)
            $('<p>')
            .text(`Correct! +${bonus}¢`)
            .css('color', '#080')
            .appendTo(feedback)
          } else if (response == '') {
            $('<p>')
            .text(`No response. +0¢`)
            .css('color', '#888')
            .appendTo(feedback)
          } else {
            add_bonus(-bonus)
            error = true
            $('<p>')
            .text(`Incorrect! -${bonus}¢`)
            .css('color', '#b00')
            .appendTo(feedback)
          }
          // if (response != word && practice) {
          //   BONUS += bonus
          // }

          if (!error && time_bonus > 0) {
            let tb = Math.round(10 * time_bonus * timer.seconds_left) / 10
            add_bonus(tb)
            if (tb > 0) {
              $('<p>')
              .text(`Time bonus: +${tb}¢`)
              .css('color', '#080')
              .appendTo(feedback)
            }
          }

          if (response == word) {
            showFeedback().append(feedback)
          } else {
            showFeedback().append(feedback)
          }
        }
      });

      // TIMER
      timer = makeTimer(recall_time / 1000, stage)
      timer.promise.then(() => {
        if (!responded) {
          log('timeout')
          showFeedback().text('Timeout').css('color', '#888')
        }
      })
    } // plugin.trial

    return plugin;
  })();

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
      let {word, image, practice=false, time_bonus=0, bonus, penalty, recall_time} = trial;

      let header = practice ?
      `
        ### Practice round

        - Hit space. An image, text box, and timer will appear.
        - If you remember the word, type it into the text box. Otherwise, leave it blank.
        - Hit enter to submit your response.
        - A question will appear. Press a key between 1 and 5 to answer it and move onto the next round.
        - This practice round does not count towards your bonus.
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

      async function ask_judgement(type) {
        console.log('ask_judgement', type)
        stage.empty()
        let text = {
          confidence: `
            <h4>How confident are you in your response?</h4>
            <p>Press a number between 1 and 5.</p>

            <b>1</b>&nbsp;&nbsp; I am not at all sure my response is correct<br>
            <b>2</b>&nbsp;&nbsp; I am not so sure my response is correct<br>
            <b>3</b>&nbsp;&nbsp; I am more or less sure my response is correct<br>
            <b>4</b>&nbsp;&nbsp; I am nearly sure my response is correct<br>
            <b>5</b>&nbsp;&nbsp; I am absolutely sure my response is correct<br>
          `,
          fok: `
            <h4>How much do you feel that you know the word?</h4>
            <p>Press a number between 1 and 5.</p>

            <b>1</b>&nbsp;&nbsp; I am absolutely sure I do not know the word<br>
            <b>2</b>&nbsp;&nbsp; I am rather sure I do not know the word<br>
            <b>3</b>&nbsp;&nbsp; I have a vague impression I know the word<br>
            <b>4</b>&nbsp;&nbsp; I am rather sure I know the word<br>
            <b>5</b>&nbsp;&nbsp; I am absolutely sure I know the word<br>
          `
        }[type]
        
        $('<div>')
        .css('text-align', 'left')
        .css('margin', '0 auto')
        .css('width', '400px')
        .html(text)
        .appendTo(stage)
        let {key, rt} = await getKeyPress(['1', '2', '3', '4', '5'])
        log('judgement', {type, key, rt})
      }

      function showFeedback(fb) {
        stage.empty()
        $('<div>')
        .css('font-size', '32pt')
        .css('font-weight', 'bold')
        .css('margin-top', 120)
        .appendTo(stage).
        append(fb)

        sleep(1500)
        .then(()=> {
          display.empty()
          jsPsych.finishTrial(data)
        })
        
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
      .keypress(async function(event) {
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
            add_bonus(-penalty)
            error = true
            $('<p>')
            .text(`Incorrect! -${penalty}¢`)
            .css('color', '#b00')
            .appendTo(feedback)
          }

          // if (response != word && practice) {
          //   BONUS += bonus
          // }

          if (time_bonus > 0) {
            let tb = Math.round(10 * time_bonus * timer.seconds_left) / 10
            add_bonus(tb)
            if (tb > 0) {
              $('<p>')
              .text(`Time bonus: +${tb}¢`)
              .css('color', '#080')
              .appendTo(feedback)
            }
          }
          let type = response == '' ? 'fok' : 'confidence'
          await ask_judgement(type)
          showFeedback(feedback, response)
        }
      });

      // TIMER
      timer = makeTimer(recall_time / 1000, stage)
      timer.promise.then(() => {
        if (!responded) {
          log('timeout')
          showFeedback('Timeout', null)
        }
      })
    } // plugin.trial

    return plugin;
  })();

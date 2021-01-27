/*
 * Example plugin template
 */

jsPsych.plugins["math"] = (function() {

  var plugin = {};

  plugin.info = {
    name: "PLUGIN-NAME",
    parameters: {}
  };

  plugin.trial = function(display_element, trial) {
    let stage = $('<div>')
    .css({
      'text-align': 'center',
    })
    .appendTo(display_element)

    // set default values for parameters
    trial.prod1Max = trial.prod1Max || 5;
    trial.prod2Max = trial.prod2Max || 5;
    trial.sumMax = trial.sumMax || 10;
    trial.maxTime = trial.maxTime || 3;
    trial.feedbackTime = trial.feedbackTime || 1;
    trial.numQuestions = trial.numQuestions || 3;
    trial.bonusRate = trial.bonusRate || 3;

    var mathProblem = function(prod1Max, prod2Max, sumMax) {
      // Return string of "prod1 * prod2 + sumMax", prod1 * prod2 + sumMax
      // where these are randomly drawn
      prod1 = Math.ceil(Math.random() * prod1Max)
      prod2 = Math.ceil(Math.random() * prod2Max)
      sum = Math.ceil(Math.random() * sumMax)
      return [prod1 + " + " + prod2 + " + " + sum, prod1 + prod2 + sum]
    }

    var numCorrect = 0;

    var displayFeedback = function(correct) {
      var response = {
        true: `Correct!<br>+${trial.bonusRate}¢`,
        false: 'Incorrect',
        timeout: 'Timeout (press enter to submit!)',
      }[correct];
      stage.html('');
      stage.append("<p class='math-message'>" + response + "</p>");
    }

    var displayQuestion = function(prod1Max, prod2Max, sumMax, depth) {
      if (depth >= trial.numQuestions) {
        stage.html('');
        // Wait for DOM to clear
        setTimeout(function() {
          jsPsych.finishTrial({
            num_correct: numCorrect
          });
        }, 10);
      }
      else {
        stage.html('');

        stage.append($('<div>', {
          "id": 'jspsych-questions',
          "class": 'math-message'
        }));

        questionAns = mathProblem(prod1Max, prod2Max, sumMax);
        var question = questionAns[0];
        var answer = questionAns[1];

        $("#jspsych-questions").append('<div id="quest-holder"></div>');
        $("#quest-holder").append('<p class="jspsych-survey-text">' + question + '</p>');
        $("#quest-holder").append('<input autocomplete="off" id="given-answer" type="text" autofocus/>');
        $('#given-answer').focus();

        var timeout = setTimeout(function() {
          displayFeedback('timeout');
        }, trial.maxTime * 1000);

        $("#quest-holder").keypress(function(event){
          var keycode = (event.keyCode ? event.keyCode : event.which);
          if (keycode == '13') {
            clearTimeout(timeout);
            var givenAns = parseInt($("#given-answer").val());
            // See if given answer is correct
            displayFeedback(givenAns == answer)
            if (givenAns == answer) {
              BONUS += trial.bonusRate
              numCorrect++;
            }
          }
        });

        setTimeout(function() {
          displayQuestion(prod1Max, prod2Max, sumMax, depth + 1)
        }, (trial.maxTime + trial.feedbackTime) * 1000);
      }
    }
    displayQuestion(trial.prod1Max, trial.prod2Max, trial.sumMax, 0);
    // Must include this to run properly
    if (false) {
      jsPsych.finishTrial();
    }
  };

  return plugin;
})();

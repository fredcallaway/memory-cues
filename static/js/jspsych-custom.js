/*
 * Plugin where logic is in a function
 */

jsPsych.plugins["custom"] = (function() {

  var plugin = {};
  
  plugin.info = {
    name: "custom",
    parameters: {}
  }

  plugin.trial = async function(display_element, trial) {
    let start = Date.now()
    let data = await trial.func($(display_element))
    data.trial_time = Date.now() - start
    $(display_element).empty()
    jsPsych.finishTrial(data)
  };

  return plugin;
})();

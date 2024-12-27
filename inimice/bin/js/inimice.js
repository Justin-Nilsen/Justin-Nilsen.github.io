
const sounds = {};

function play_sound(sound_name, do_loop=false){
  let sound;

  sound = new Howl({
    src: ['resources/sounds/' + sound_name],
    loop: do_loop,
  });
  
  sound.once('load', function(){
    sound.play();
  });

  sound.once('end', function(){
    if (!sound.loop()){
      sound.unload();
    }
  });
  sound.play();
  sounds[sound_name] = sound;
}

function stop_sound(sound_name, fade=false){
  if (!fade){
    sounds[sound_name].stop();
    sounds[sound_name].unload();
    delete sounds[sound_name];
  } else {
    sounds[sound_name].fade(1.0, 0.0, 1000.0);
    sounds[sound_name].once('fade', function() {
      sounds[sound_name].stop();
      sounds[sound_name].unload();
      delete sounds[sound_name];
    })
  }
}

//play_sound('subway-ambience-001.mp3', true);

document.addEventListener('DOMContentLoaded', function() {
  const body = document.getElementsByTagName('body')[0];
  body.style.opacity = "1.0";
  const navbar = document.getElementById('navbarColor02');
  const navBarToggleButton = document.getElementById('navbarToggleButton');
  navBarToggleButton.addEventListener('click', () => {
      if (navbar.classList.contains('show')){
          navbar.classList.remove('show');
      } else {
          navbar.classList.add('show');
      }
  });
});

document.addEventListener('DOMContentLoaded', function() {

  /*
  const importButton = document.getElementById('importButton');
  const importInput = document.getElementById('importInput');

  importButton.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target.result;
        importFromJSON(textContent);
      };
      reader.readAsText(file);
    }
  });
  */

  const dialogOptionsPanel = document.getElementById('dialogButtons');
  const container = document.getElementById('revealed-container');
  const actualButtons = document.getElementById('actualButtons');

  async function revealText(htmlString, revealTargetId) {

    // Parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div id="textContainer">' + htmlString + '</div>', 'text/html');

    const referenceContainer = doc.querySelector('#textContainer');

    // Check if the container was found
    if (!referenceContainer) {
      console.error("No #textContainer found in the provided HTML string.");
      return;
    }

    //const referenceContainer = document.getElementById(referenceContainerId);
    const revealContainer = document.getElementById(revealTargetId);

    // Create a cloned version of the container node itself (no children)
    const cloneContainer = referenceContainer.cloneNode(false);
    // Ensure the clone container does not have the same ID to avoid collisions
    cloneContainer.removeAttribute('id');
    cloneContainer.removeAttribute('contenteditable')
    revealContainer.appendChild(cloneContainer);

    // Define extra delays
    const clauseDelay = 9;    // Delay after finishing a clause
    const sentenceDelay = 15; // Delay after finishing a sentence
    const paragraphDelay = 25;
        
    /*
    char: 0.01
    clause: 0.1
    sentence: 0.25
    */

      // Reveal a text node by splitting into sentences/clauses and revealing gradually
    async function revealTextNode(originalTextNode, parentInClone) {
      let text = originalTextNode.nodeValue;
      const newTextNode = document.createTextNode('');
      parentInClone.appendChild(newTextNode);

    
      text = substituteVariables(text);
      // Split text into sentences
      let sentences = splitIntoSentences(text);
      if (sentences.length === 0) {
          // If no sentences, just reveal as is
          await revealString(newTextNode, text);
          return;
      }

      // Reveal sentence by sentence
      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
          let sentence = sentences[sIdx];
          // Split sentence into clauses
          let clauses = splitSentenceIntoClauses(sentence);
          if (clauses.length === 0) {
              clauses = [sentence];
          }

          for (let cIdx = 0; cIdx < clauses.length; cIdx++) {
              let clause = clauses[cIdx];
              await revealString(newTextNode, clause);
              if (cIdx < clauses.length - 1) {
                  await delay(readingSpeed * clauseDelay);
              }
          }

          if (sIdx < sentences.length - 1) {
              await delay(readingSpeed * sentenceDelay);
          }
      }
    }

    let isUserScrolling = false;

    container.addEventListener('scroll', () => {
        const scrollPosition = container.scrollTop + container.clientHeight;// - window.screen.height*0.15;
        const atBottom = scrollPosition >= container.scrollHeight - 5; // Allow small margin for rounding

        // If the user scrolls up, pause auto-scrolling
        isUserScrolling = !atBottom;
    });

    // Reveal a string character by character inside a given text node
    function revealString(textNode, str) {
      return new Promise(resolve => {
        let i = 0;
        function revealLetter() {
          if (i < str.length) {
            textNode.nodeValue += str.charAt(i);
            i++;
            if (!isUserScrolling) {
              container.scrollTop = container.scrollHeight;
            }
            setTimeout(revealLetter, readingSpeed);
          } else {
            resolve();
          }
        }
        revealLetter();
      });
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Function to process nodes sequentially, cloning structure from original to target
    async function processNodesSequentially(originalNodes, targetParent) {
      for (const originalNode of originalNodes) {
        if (originalNode.nodeType === Node.TEXT_NODE) {
          // Reveal text in a newly created text node
          await revealTextNode(originalNode, targetParent);
        } else if (originalNode.nodeType === Node.ELEMENT_NODE) {

          if (originalNode.tagName && originalNode.tagName.toLowerCase() == 'span' && originalNode.className == 'inline-code'){
            eval(originalNode.textContent);
            continue;
          }
          // Clone the element without children
          const clonedElement = originalNode.cloneNode(false);
          // Append it to the target parent
          targetParent.appendChild(clonedElement);
          // Recursively reveal its children
          await processNodesSequentially(Array.from(originalNode.childNodes), clonedElement);

          if (originalNode.tagName && originalNode.tagName.toLowerCase() === 'p' ||
          originalNode.tagName && originalNode.tagName.toLowerCase() === 'h1' ||
          originalNode.tagName && originalNode.tagName.toLowerCase() === 'h2' ||
          originalNode.tagName && originalNode.tagName.toLowerCase() === 'h3' ||
          originalNode.tagName && originalNode.tagName.toLowerCase() === 'h4' ||
          originalNode.tagName && originalNode.tagName.toLowerCase() === 'li'
          ) {
            await delay(readingSpeed * paragraphDelay);
          }
        }
      }
    }

    // Start processing from the reference container and build into the cloneContainer
    await processNodesSequentially(Array.from(referenceContainer.childNodes), cloneContainer);
  }

  const Genders = {
    Male: 0,
    Female: 1,
    Non: 2
  };

  let gender = Genders.Male;

  const PronounSubstitutions = {
    "{His}": ["His", "Her", "Their"],
    "{his}": ["his", "her", "their"],
    "{Hisp}": ["His", "Hers", "Theirs"],
    "{hisp}": ["his", "hers", "theirs"],
    "{He}": ["He", "She", "They"],
    "{he}": ["he", "she", "they"],
    "{Him}": ["Him", "Her", "Them"],
    "{him}": ["him", "her", "them"],
    "{Himself}": ["Himself", "Herself", "Themself"],
    "{himself}": ["himself", "herself", "themself"]
  }
  
  function PronounSub(key){
    return PronounSubstitutions[key][gender];
  }

  function substituteVariables(text){
    var cleanedText = text.replace(/Matoran/g, playerFirstName);
    cleanedText = cleanedText.replace(/{His}/g, PronounSub("{His}"));
    cleanedText = cleanedText.replace(/{his}/g, PronounSub("{his}"));
    cleanedText = cleanedText.replace(/{Hips}/g, PronounSub("{Hisp}"));
    cleanedText = cleanedText.replace(/{hisp}/g, PronounSub("{hisp}"));
    cleanedText = cleanedText.replace(/{He}/g, PronounSub("{He}"));
    cleanedText = cleanedText.replace(/{he}/g, PronounSub("{he}"));
    cleanedText = cleanedText.replace(/{Him}/g, PronounSub("{Him}"));
    cleanedText = cleanedText.replace(/{him}/g, PronounSub("{him}"));
    cleanedText = cleanedText.replace(/{Himself}/g, PronounSub("{Himself}"));
    cleanedText = cleanedText.replace(/{himself}/g, PronounSub("{himself}"));
    return cleanedText;
  }

  let speedIndex = 1;
  let speeds = [50, 40, 30, 20, 10, 7, 5, 2, 1];
  let readingSpeed = speeds[speedIndex];

  let readingSpeedSlider = document.getElementById('readingSpeedSlider');
  let readingSpeedSliderContainer = document.getElementById('slider-container');
  let name_input_panel = document.getElementById('input_panel');
  let name_input_button = document.getElementById('name_input_button');
  let first_name_input = document.getElementById('first_name_input');
  let last_name_input = document.getElementById('last_name_input');
  let gender_selection = document.getElementById('gender_input');

  function load_name_values_and_begin(event){
    event.preventDefault();
    playerFirstName = first_name_input.value;
    playerLastName = last_name_input.value;
    gender = gender_selection.value;
    name_input_panel.style.display = "none";
    Begin();
  }

  name_input_button.addEventListener('click', (event) => {
    load_name_values_and_begin(event);
  });


  name_input_panel.addEventListener("submit", load_name_values_and_begin);

  readingSpeedSlider.addEventListener('input', (event) => {
    speedIndex = event.target.value;
    readingSpeed = speeds[speedIndex];
  });

  // SPEED BUTTON
  /* speedIndex = (speedIndex + 1) % speeds.length; */

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      speedIndex = (speedIndex + 1) < speeds.length ? speedIndex + 1 : speedIndex;
      readingSpeed = speeds[speedIndex];
      readingSpeedSlider.value = speedIndex;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      speedIndex = (speedIndex - 1) >= 0 ? speedIndex - 1 : speedIndex;
      readingSpeed = speeds[speedIndex];
      readingSpeedSlider.value = speedIndex;
    }
  });

  let currentBlockId = 0;
  let blocks = {};
  let inventory = [];
  let playerFirstName = "Joe";
  let playerLastName = "Scott";

  function importFromJSON(jsonData) {
    
    const parsedData = JSON.parse(jsonData);
    importedData = parsedData['data']['blocksData'];

    /*
    Store arguments and the body in your json:

    {"function":{"arguments":"a,b,c","body":"return a*b+c;"}}
    Now parse json and instantiate the function:

    var f = new Function(function.arguments, function.body);
    */

    setTimeout(() => {
      
      importedData.forEach(blockData => {
        blocks[blockData.id] = blockData;
        //blockData.subBlocks.forEach((subBlockData, index) => { });
      });

      mainloop(blocks);

      //revealText(blocks[blocks[currentBlockId].linkTo]['text'], 'revealed-container', 30);
      
    }, 0);
  }

  async function mainloop() {
    currentBlockId = blocks[currentBlockId].linkTo;
    while(true){
      if (blocks[currentBlockId].blocktype == 1){
        eval(blocks[currentBlockId]['text']);
      } else if (blocks[currentBlockId].blocktype == 0){
        await revealText(blocks[currentBlockId]['text'], 'revealed-container', readingSpeed);
      }
      if (blocks[currentBlockId].subBlocks.length > 0){
        newBlockId = await waitForButtonPress();
      } else {
        currentBlockId = blocks[currentBlockId].linkTo;
      }
    }
  }

  async function waitForButtonPress() {
    return new Promise((resolve) => {
      actualButtons.replaceChildren();

      let blocksGenerated = 0;
      blocks[currentBlockId].subBlocks.forEach((subBlockData, index) => {

        let doShowSubblock = true;

        if (subBlockData.hasOwnProperty("condition") && subBlockData.condition.trim() !== ""){
          let condition = eval(subBlockData.condition);
          if (!condition){
            doShowSubblock = false;
          } else {
            doShowSubblock = true;
          }
        }
        
        if (doShowSubblock){
          const butt = document.createElement('button');
          butt.classList.add("dialogButton");
          butt.addEventListener("click", function() {
            dialogOptionsPanel.style.display = 'none';
            currentBlockId = subBlockData.linkTo;
            resolve(currentBlockId);
          });
          butt.innerHTML = subBlockData.text;
          actualButtons.appendChild(butt);
          blocksGenerated++;
        }
      });

      if (blocksGenerated <= 0){
        currentBlockId = blocks[currentBlockId].linkTo;
        resolve(currentBlockId);
      } else {
        dialogOptionsPanel.style.display = 'block';
      }
    });
  }

  function Begin(){
    /*
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      readingSpeedSliderContainer.style.display = 'block';
    }
      */
    readingSpeedSliderContainer.style.display = 'flex';
    readingSpeedSlider.value = speedIndex;
    importFromJSON(decodeURIComponent(storyGraphData));
  }

  setTimeout(() => {
    // WAIT FOR INPUT
    //importFromJSON(decodeURIComponent(storyGraphData));
  }, 50);
});
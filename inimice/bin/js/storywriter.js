const svg = document.getElementById('svgCanvas');

function getSVGPoint(evt) {
  const point = svg.createSVGPoint();
  point.x = evt.clientX;
  point.y = evt.clientY;
  const ctm = svg.getScreenCTM().inverse();
  return point.matrixTransform(ctm);
}

var FontAttributor = Quill.import('formats/font');
var fonts = ['libertine', 'arial'];
FontAttributor.whitelist = fonts;
Quill.register(FontAttributor, true);


var Embed = Quill.import('blots/block/embed');
var Inline = Quill.import('blots/inline');

class InlineCodeBlot extends Inline {
  static create(value) {
    let node = super.create();
    return node;
  }

  // This tells Quill what value represents this format when it's applied.
  static formats(node) {
    return true; // Always return true to indicate the highlight format is present
  }
}
// Give your blot a unique name and define the tag it uses
InlineCodeBlot.blotName = 'inline_code';
InlineCodeBlot.className = 'inline-code';
InlineCodeBlot.tagName = 'span';
// Register the blot with Quill
Quill.register({
  'formats/inline_code': InlineCodeBlot
});

class Hr extends Embed {
    static create(value) {
        let node = super.create(value);
        // give it some margin
        node.setAttribute('style', "height:0px; margin-top:10px; margin-bottom:10px;");
        return node;
    }
}
Hr.blotName = 'hr'; //now you can use .ql-hr classname in your toolbar
Hr.className = 'my-hr';
Hr.tagName = 'hr';

Quill.register({
    'formats/hr': Hr
});

document.addEventListener('DOMContentLoaded', () => {

  //const homeButton = document.getElementById('homeButton');
  const titleInput = document.getElementById('titleInput');
  const centerButton = document.getElementById('centerButton');
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const importInput = document.getElementById('importInput');
  const canvasContainer = document.getElementById('canvasContainer');
  const containerContainer = document.getElementById('canvasContainerContainer');
  const svgCanvas = document.getElementById('svgCanvas');

  let blockIdCounter = 0;
  const blocksData = []; // To store blocks and their data
  const lines = []; // To store lines and their data

  let scale = 1; // Initial scale for zooming

  centerButton.addEventListener('click', () => {
    panX = 0;
    panY = 0;
    scale = 1;
    updateScale();
  });

  function adjustCanvasPos(deltaScale, evt){

    const newScale = scale * deltaScale;

    // Limit the scale to a reasonable range
    if (newScale < 0.2 || newScale > 5) {
      return;
    }

    // Get mouse position in SVG coordinates before scaling
    const mousePoint = getSVGPoint(evt);

    scale = newScale;
    updateScale();

    /*
    // Calculate the new viewBox x and y to keep the mouse point stationary
    viewBox.x = mousePoint.x - (mousePoint.x - viewBox.x) * deltaScale;
    viewBox.y = mousePoint.y - (mousePoint.y - viewBox.y) * deltaScale;

    // Apply the new viewBox
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    */
  }
  
  canvasContainer.style.transformOrigin = `center`;

  
  let isTouchDragging = false;
  let startTouchX, startTouchY;
  let initialDistance = 1;


  document.addEventListener('touchstart', (e) => {
    e.preventDefault();

    if (e.target.id !== 'svgCanvas' && e.target.id !== 'grid_background' && e.target.id !== 'canvasContainerContainer') {
      // Do not start drag if clicking inside textarea, input, or button
      return;
    }

    isTouchDragging = true;
    if (e.touches.length === 2) {
      initialDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
    
    startTouchX = e.touches[0].clientX;
    startTouchY = e.touches[0].clientY;
    
    
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isTouchDragging) return;
  
    e.preventDefault();
  
    if (e.touches.length === 2) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const scaleFactor = currentDistance / initialDistance;
      initialDistance = currentDistance;

      scale = scale * scaleFactor;
      updateScale();
    } else {
      
      let newX = e.touches[0].clientX - startTouchX;
      let newY = e.touches[0].clientY - startTouchY;

      startTouchX = e.touches[0].clientX;
      startTouchY = e.touches[0].clientY;
    
      panX += newX / scale;
      panY += newY / scale;
      updateScale();
      
    }
  });
  
  document.addEventListener('touchend', (e) => {
    isTouchDragging = false;
  });
  

  document.addEventListener('wheel', (event) => {
    event.preventDefault();

    if (!event.ctrlKey){
      
      panX -= event.deltaX;
      panY -= event.deltaY;
      updateScale();
      //canvasContainer.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;

    } else {

      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const rect = canvasContainer.getBoundingClientRect();
      const scaleFactor = event.deltaY < 0 ? 1.01 : 1 / 1.01;

      scale = scale * Math.pow(scaleFactor, Math.abs(event.deltaY));
      //canvasContainer.style.transformOrigin = `center`;
      updateScale();
    }

  }, {passive: false});


  exportButton.addEventListener('click', () => {
    exportToJSON();
  });

  importButton.addEventListener('click', () => {
    importInput.click();
  });

  importInput.addEventListener('change', () => {
    const file = importInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonData = e.target.result;
        setTimeout(() => {
          importFromJSON(jsonData, file.name.endsWith(".json"));
        }, 100);
      };
      reader.readAsText(file);
    }
  });

  function updateScale() {
    canvasContainer.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;

    // Update the canvas size to account for scaling
    updateCanvasSize();
  }

  function createBlock(x, y, blockData = null, blocktype = 0, default_text = "") {
    const block = document.createElement('div');
    block.classList.add('block');
    block.dataset.blocktype = blocktype;
    block.style.left = x + 'px';
    block.style.top = y + 'px';
    block.id = 'block-' + blockIdCounter;

    if (blocktype == -1){
      block.classList.add('block-start');
    } else if (blocktype == 0){
      block.classList.add('block-main');
    } else if (blocktype == 1){
      block.classList.add('block-action');
    } else if (blocktype == 2){
      block.classList.add('block-boolean');
    }

    // If blockData is provided, use its id; otherwise, assign a new id
    if (blockData && typeof blockData.id !== 'undefined') {
      block.dataset.blockId = blockData.id;
      // Update blockIdCounter if necessary
      if (blockData.id >= blockIdCounter) {
        blockIdCounter = blockData.id + 1;
      }
    } else {
      block.dataset.blockId = blockIdCounter;
      blockIdCounter++;
    }

    // If blockData is provided, use it; otherwise, create a new blockData object
    if (!blockData) {
      blockData = {
        id: parseInt(block.dataset.blockId),
        text: '',
        subBlocks: [],
        linkTo: null,
        position: { x, y },
        blocktype: blocktype,
      };
      blocksData.push(blockData);
    } else {
      // Ensure position is set
      if (!blockData.position) {
        blockData.position = { x, y };
        blockData.blocktype = blocktype;
      }
      blocksData.push(blockData);
    }

    const blockHeader = document.createElement('h5');
    if (blocktype == -1)
      blockHeader.innerText = 'Start Block';
    else if (blocktype == 0)
      blockHeader.innerText = 'Story Block';
    else if (blocktype == 1)
      blockHeader.innerText = 'Action Block';
    else if (blocktype == 2)
      blockHeader.innerText = 'Conditional Block';
    blockHeader.classList.add('block_header');
    blockHeader.style.color = 'white';
    block.appendChild(blockHeader);

    if (blocktype == 0){

      // Block Delete Button
      const blockDeleteButton = document.createElement('button');
      blockDeleteButton.textContent = 'X';
      blockDeleteButton.classList.add('block-delete-button');
      blockDeleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBlock(block);
      });
      block.appendChild(blockDeleteButton);

      // Textarea
      const textarea = document.createElement('div');
      textarea.classList.add('textarea');
      /*
      textarea.contentEditable = true;
      if (blocktype == 0){
        textarea.classList.add('dialog');
      } else {
        textarea.classList.add('script');
      }
        */

        /*
      textarea.addEventListener('input', () => {
        blockData.text = textarea.innerHTML;
        console.log(blockData.text);
        autoResizeTextarea(textarea);
        updateLines(block);
      });
      */

      textarea.style.width = '100%';
      textarea.style.boxSizing = 'border-box';

      autoResizeTextarea(textarea);

      block.appendChild(textarea);

      const toolbarOptions = [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'link', 'hr', 'inline_code'],
        [{ 'header': 1 }, { 'header': 2 }, { 'header': 3 }],               // custom button values
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent

        //[{ 'header': [1, 2, 3, 4, 5, 6, false] }],

        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'align': [] }],
        ['clean'],                                         // remove formatting button
        [{ 'font': ['libertine', 'arial'] }]
      ];

      const quill = new Quill(textarea, {
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: {
              'hr': function(value){
                // get the position of the cursor
                var range = quill.getSelection();
                if (range) {
                  quill.insertEmbed(range.index,"hr","null")
                }
              },

              'inline_code': function(value){
                // We'll define how this button toggles the highlight format
                let range = quill.getSelection();
                if (range) {
                  // Check if currently highlighted
                  let currentFormat = quill.getFormat(range);
                  if (currentFormat.inline_code) {
                    // If highlighted, remove highlight
                    //quill.formatText(range.index, range.length, 'highlight', false);
                    quill.format('inline_code', false);
                  } else {

                    /*
                    // If not highlighted, apply highlight
                    this.quill.insertText(range.index, '{', 'user');
                    // Insert the trailing '}' after the selected text plus the one char we just added
                    this.quill.insertText(range.index + range.length + 1, '}', 'user');

                    const newLength = range.length + 2; // original length plus 2 braces
                    const newIndex = range.index;       // starting from the same place

                    // Update selection to cover braces and original text
                    this.quill.setSelection(newIndex, newLength, 'user');
                    */
                    quill.format('inline_code', true);
                  }
                }
              }
            }
          }
        },
        
        theme: 'snow',
        
      });

      const actualQuillText = textarea.querySelector('.ql-editor');

      quill.on('text-change', function () {
        blockData.text = actualQuillText.innerHTML;
        autoResizeTextarea(textarea);
        updateLines(block);
      });

      if (blockData.text != null && blockData.text != ''){
        actualQuillText.innerHTML = blockData.text;
      }

      /*
      if (default_text !== ''){
        textarea.innerHTML = default_text;
      } else {
        textarea.innerHTML = blockData.text;
      }
      */
      blockData.text = actualQuillText.innerHTML;

    } else if (blocktype == 1 || blocktype == 2){
      // Block Delete Button
      const blockDeleteButton = document.createElement('button');
      blockDeleteButton.textContent = 'X';
      blockDeleteButton.classList.add('block-delete-button');
      blockDeleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBlock(block);
      });
      block.appendChild(blockDeleteButton);

      // Textarea
      const textarea = document.createElement('textarea');
      textarea.classList.add('textarea');
      textarea.classList.add('script');
      
      textarea.addEventListener('input', () => {
        blockData.text = textarea.value;
        //console.log(blockData.text);
        autoResizeTextarea(textarea);
        updateLines(block);
      });

      textarea.style.width = '100%';
      textarea.style.boxSizing = 'border-box';

      if (default_text !== ''){
        textarea.value = default_text;
      } else {
        textarea.value = blockData.text;
      }
      blockData.text = textarea.value;

      autoResizeTextarea(textarea);

      block.appendChild(textarea);
    }

    if (blocktype == 0){
      // Add Option Button
      const addOptionButton = document.createElement('button');
      addOptionButton.textContent = 'Add Option';
      addOptionButton.classList.add("btn-secondary");
      addOptionButton.classList.add("btn");
      addOptionButton.addEventListener('click', () => {
        addSubBlock(block, blockData);
        setTimeout(() => {
          updateAllLines();
        }, 0);
      });
      block.appendChild(addOptionButton);

      const copyTextButton = document.createElement('button');
      copyTextButton.textContent = 'Copy';
      copyTextButton.classList.add("btn-dark");
      copyTextButton.classList.add("btn");
      copyTextButton.style = "margin-left: 5px;";
      copyTextButton.addEventListener('click', () => {
        copyTextUpTo(block);
      });
      block.appendChild(copyTextButton);
    }

    if (blocktype != 2){
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '⦸';
      deleteButton.classList.add('delete-button');
      deleteButton.classList.add("btn-dark");
      deleteButton.classList.add("btn");
      deleteButton.style.float = 'right';
      deleteButton.style.marginRight = '0px';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        for (let i = lines.length - 1; i >= 0; i--) {
          let lineInfo = lines[i];
          if (lineInfo.from === block) {
            svgCanvas.removeChild(lineInfo.path);
            lines.splice(i, 1);
            blockData.linkTo = null;
            break; // Assuming only one outgoing link
          }
        }
      });

      // Link Button on the block
      const blockLinkButton = document.createElement('button');
      blockLinkButton.textContent = '⇨';
      blockLinkButton.classList.add('link-button');
      blockLinkButton.classList.add("btn-dark");
      blockLinkButton.classList.add("btn");
      blockLinkButton.style.float = 'right';
      blockLinkButton.style.marginRight = '0px';

      blockLinkButton.addEventListener('click', (e) => {
        e.stopPropagation();
        startLinkCreation(block);
      });

      block.appendChild(blockLinkButton);
      block.appendChild(deleteButton);
      
    }

    // Add existing sub-blocks if any
    if (blockData.subBlocks && blockData.subBlocks.length > 0) {
      blockData.subBlocks.forEach((subBlockData) => {
        addSubBlock(block, blockData, subBlockData, blocktype==2);
      });
    } else if (blocktype == 2){
      addSubBlock(block, blockData, null, true);
      addSubBlock(block, blockData, null, true);
    }

    // Make block draggable
    makeDraggable(block);

    canvasContainer.appendChild(block);
    updateCanvasSize(); // Adjust canvas size
  }

  function addSubBlock(block, blockData, subBlockData = null, cannotDelete = false) {
    const subBlock = document.createElement('div');
    subBlock.classList.add('sub-block');

    let subBlockIndex;
    if (!subBlockData) {
      subBlockData = {
        text: '',
        linkTo: null,
      };
      blockData.subBlocks.push(subBlockData);
      subBlockIndex = blockData.subBlocks.length - 1;
    } else {
      // Find the index of subBlockData in blockData.subBlocks
      subBlockIndex = blockData.subBlocks.indexOf(subBlockData);
      if (subBlockIndex === -1) {
        // If not found (should not happen), add it
        blockData.subBlocks.push(subBlockData);
        subBlockIndex = blockData.subBlocks.length - 1;
      }
    }
    subBlock.dataset.subBlockId = subBlockIndex;

    // Container for textarea and buttons
    const subBlockContent = document.createElement('div');
    subBlockContent.style.display = 'flex';
    subBlockContent.style.alignItems = 'center';
    subBlockContent.style.width = '100%'; // Ensure it takes full width

    if (!cannotDelete){
      // Buttons container
      const preButtonsContainer = document.createElement('div');
      preButtonsContainer.style.display = 'flex';
      preButtonsContainer.style.marginLeft = '-5px';
      preButtonsContainer.style.marginRight = '10px';
      preButtonsContainer.style.height = '100%';

      // Delete Button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'X';
      deleteButton.classList.add('delete-button');
      deleteButton.style.height = '100%';
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSubBlock(subBlock, blockData);
        setTimeout(() => {
          updateAllLines();
        }, 0);
      });

      preButtonsContainer.appendChild(deleteButton);
      subBlockContent.appendChild(preButtonsContainer);

    }

    if (!cannotDelete){
      const textarea = document.createElement('div');
      textarea.classList.add('textarea');
      textarea.contentEditable = true;
      textarea.classList.add('dialog');
      textarea.classList.add('option');
      textarea.innerHTML = subBlockData.text || '';
      textarea.addEventListener('input', () => {
        subBlockData.text = textarea.innerHTML;
        autoResizeTextarea(textarea);
        updateLines(block);
      });
      textarea.style.width = '100%';
      textarea.style.boxSizing = 'border-box';
      autoResizeTextarea(textarea);



      const textarea2 = document.createElement('div');
      textarea2.classList.add('textarea');
      textarea2.contentEditable = true;
      textarea2.classList.add('script');
      textarea2.classList.add('option');
      textarea2.innerHTML = subBlockData.condition || '';
      textarea2.addEventListener('input', () => {

        subBlockData.condition = textarea2.innerHTML;
        autoResizeTextarea(textarea2);
        updateLines(block);
      });
      textarea2.style.width = '100%';
      textarea2.style.boxSizing = 'border-box';
      autoResizeTextarea(textarea2);

      subBlockContent.appendChild(textarea2);
      subBlockContent.appendChild(textarea);
    }


    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.marginLeft = 'auto';
    //buttonsContainer.style.marginLeft = '5px';


    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = '⦸';
    deleteButton.classList.add('delete-button');
    deleteButton.classList.add("btn-dark");
    deleteButton.classList.add("btn");
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      for (let i = lines.length - 1; i >= 0; i--) {
        let lineInfo = lines[i];
        if (lineInfo.from === subBlock) {
          svgCanvas.removeChild(lineInfo.path);
          lines.splice(i, 1);
          blockData.subBlocks[subBlockIndex].linkTo = null;
          break; // Assuming only one outgoing link
        }
      }
      //deleteSubBlock(subBlock, blockData);
    });

    buttonsContainer.appendChild(deleteButton);

    // Link Button
    const linkButton = document.createElement('button');
    linkButton.textContent = '⇨';
    linkButton.classList.add('link-button');
    linkButton.classList.add("btn-dark");
    linkButton.classList.add("btn");
    linkButton.addEventListener('click', (e) => {
      e.stopPropagation();
      startLinkCreation(subBlock);
    });

    buttonsContainer.appendChild(linkButton);
    
    subBlockContent.appendChild(buttonsContainer);

    subBlock.appendChild(subBlockContent);
    block.appendChild(subBlock);
    updateCanvasSize(); // Adjust canvas size
  }

  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(40, textarea.scrollHeight) + 'px';
    updateCanvasSize(); // Adjust canvas size
  }

  panX = 0;
  panY = 0;

  function makeCanvasDraggable(){
    let isCanvasDragging = false;
    let startX, startY, initialX, initialY;

    document.addEventListener('mousedown', (e) => {

      console.log(e.target);
      if (e.target.id !== 'svgCanvas' && e.target.id !== 'grid_background' && e.target.id !== 'canvasContainerContainer') {
        // Do not start drag if clicking inside textarea, input, or button
        return;
      }
      isCanvasDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      initialX = panX;
      initialY = panY;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    });

    function drag(e, touch=false) {
      if (isCanvasDragging) {
        const dx = ((touch ? e.touches[0].clientX : e.clientX) - startX) / scale; // Adjust for scale
        const dy = ((touch ? e.touches[0].clienty : e.clientY) - startY) / scale; // Adjust for scale

        panX = initialX + dx;
        panY = initialY + dy;

        canvasContainer.style.transform = `scale(${scale}) translate(${panX}px, ${panY}px)`;
      }
    }

    function stopDrag(e, touch=false) {
      isCanvasDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }

  makeCanvasDraggable();

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    element.addEventListener('mousedown', (e) => {

      const block_element = e.target.closest('.block');
      if (Boolean(event.target.closest('.textarea')) || block_element == null || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        // Do not start drag if clicking inside textarea, input, or button
        return;
      }
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = parseInt(element.style.left, 10);
      initialY = parseInt(element.style.top, 10);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    });

    element.addEventListener('touchstart', (e) => {

      const block_element = e.target.closest('.block');
      if (Boolean(event.target.closest('.textarea')) || block_element == null || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
        // Do not start drag if clicking inside textarea, input, or button
        return;
      }
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      initialX = parseInt(element.style.left, 10);
      initialY = parseInt(element.style.top, 10);
      document.addEventListener('touchmove', touchDrag);
      document.addEventListener('touchend', stopTouchDrag);
    });

    function drag(e) {
      if (isDragging) {
        const dx = (e.clientX - startX) / scale; // Adjust for scale
        const dy = (e.clientY - startY) / scale; // Adjust for scale
        element.style.left = (initialX + dx) + 'px';
        element.style.top = (initialY + dy) + 'px';
        updateLines(element);
      }
    }

    function touchDrag(e) {
      if (isDragging) {
        const dx = (e.touches[0].clientX - startX) / scale; // Adjust for scale
        const dy = (e.touches[0].clientY - startY) / scale; // Adjust for scale
        element.style.left = (initialX + dx) + 'px';
        element.style.top = (initialY + dy) + 'px';
        updateLines(element);
      }
    }

    function stopTouchDrag() {
      isDragging = false;

      document.removeEventListener('touchmove', touchDrag);
      document.removeEventListener('touchend', stopTouchDrag);

      // Update block position in data model
      const blockId = element.dataset.blockId;
      const blockData = blocksData.find(b => b.id == blockId);
      if (blockData) {
        blockData.position = {
          x: parseInt(element.style.left, 10),
          y: parseInt(element.style.top, 10),
        };
      }

      updateCanvasSize(); // Adjust canvas size after dragging
    }

    function stopDrag() {
      isDragging = false;

      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);

      // Update block position in data model
      const blockId = element.dataset.blockId;
      const blockData = blocksData.find(b => b.id == blockId);
      if (blockData) {
        blockData.position = {
          x: parseInt(element.style.left, 10),
          y: parseInt(element.style.top, 10),
        };
      }

      updateCanvasSize(); // Adjust canvas size after dragging
    }
  }

  // Keep track of link creation state
  let isLinking = false;
  let linkStartElement = null;
  let tempPath = null;

  function startLinkCreation(element) {
    isLinking = true;
    linkStartElement = element;
    document.addEventListener('mousemove', trackMouseForLink);
    document.addEventListener('click', completeLink);
  }

  function trackMouseForLink(e) {
    if (isLinking) {
      const rect = canvasContainer.getBoundingClientRect();
      const startPos = getElementPosition(linkStartElement, 'from');
      const x1 = startPos.x;
      const y1 = startPos.y;
      const x2 = (e.clientX - rect.left) / scale;
      const y2 = (e.clientY - rect.top) / scale;

      if (tempPath) {
        svgCanvas.removeChild(tempPath);
      }
      tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const pathData = generateBezierPath(x1, y1, x2, y2);
      tempPath.setAttribute('d', pathData);
      tempPath.setAttribute('stroke', 'gray');
      tempPath.setAttribute('stroke-width', '2');
      tempPath.setAttribute('fill', 'none');
      tempPath.setAttribute('stroke-dasharray', '5,5'); // make it dashed to indicate it's temporary
      svgCanvas.appendChild(tempPath);
    }
  }

  function completeLink(e) {
    if (isLinking) {
      
      var target = null;

      target = e.target.closest('.block');

      if (target && target !== linkStartElement.closest('.block')) {
        // Remove existing outgoing link from linkStartElement, if any
        for (let i = lines.length - 1; i >= 0; i--) {
          let lineInfo = lines[i];
          if (lineInfo.from === linkStartElement) {
            svgCanvas.removeChild(lineInfo.path);
            lines.splice(i, 1);
            break; // Assuming only one outgoing link
          }
        }

        // Proceed to create new link
        const fromPos = getElementPosition(linkStartElement, 'from');
        const toPos = getElementPosition(target, 'to');
        const x1 = fromPos.x;
        const y1 = fromPos.y;
        const x2 = toPos.x;
        const y2 = toPos.y;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = generateBezierPath(x1, y1, x2, y2);
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', 'gray');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)'); // Add arrowhead

        svgCanvas.appendChild(path);

        // Store line information for updates when blocks move
        const lineInfo = {
          path: path,
          from: linkStartElement,
          to: target,
        };
        lines.push(lineInfo);

        // Update the data model
        const sourceBlockId = linkStartElement.closest('.block').dataset.blockId;
        const targetBlockId = target.dataset.blockId;

        if (linkStartElement.classList.contains('sub-block')) {
          // It's a sub-block
          const subBlockIndex = getSubBlockIndex(linkStartElement);
          const blockData = blocksData.find(b => b.id == sourceBlockId);
          if (blockData && blockData.subBlocks[subBlockIndex]) {
            blockData.subBlocks[subBlockIndex].linkTo = parseInt(targetBlockId);
          }
        } else {
          // It's a block
          const blockData = blocksData.find(b => b.id == sourceBlockId);
          if (blockData) {
            blockData.linkTo = parseInt(targetBlockId);
          }
        }
      }

      // Clean up
      if (tempPath) {
        svgCanvas.removeChild(tempPath);
        tempPath = null;
      }
      isLinking = false;
      linkStartElement = null;
      document.removeEventListener('mousemove', trackMouseForLink);
      document.removeEventListener('click', completeLink);
    }
  }

  function generateBezierPath(x1, y1, x2, y2) {
    const deltaX = Math.max(Math.abs(x2 - x1) * 0.5, 200.0);
    const cpx1 = x1 + deltaX;
    const cpy1 = y1;
    const cpx2 = x2 - deltaX;
    const cpy2 = y2;
    return `M ${x1},${y1} C ${cpx1},${cpy1} ${cpx2},${cpy2} ${x2},${y2}`;
  }

  function getElementPosition(element, mode) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();

    let x, y;

    if (mode === 'from') {
      // For origin of the link (right side)
      if (element.classList.contains('sub-block')) {
        // For sub-blocks, start from the right edge of the parent block
        const parentBlockRect = element.closest('.block').getBoundingClientRect();
        x = (parentBlockRect.right - containerRect.left) / scale;
        y = (elementRect.top - containerRect.top + elementRect.height / 2) / scale;
      } else {
        const buttonElementRect = element.querySelector(".link-button").getBoundingClientRect(); 
        x = (elementRect.right - containerRect.left) / scale;
        y = (buttonElementRect.top - containerRect.top + buttonElementRect.height / 2) / scale;
      }
    } else if (mode === 'to') {
      // For destination of the link (left side)
      x = (elementRect.left - containerRect.left) / scale;
      y = (elementRect.top - containerRect.top + elementRect.height / 2) / scale;
    }

    return { x, y };
  }

  function updateLines(movedElement) {
    lines.forEach((lineInfo) => {
      if (
        lineInfo.from.closest('.block') === movedElement ||
        lineInfo.to === movedElement ||
        lineInfo.from === movedElement
      ) {
        const fromPos = getElementPosition(lineInfo.from, 'from');
        const toPos = getElementPosition(lineInfo.to, 'to');
        const x1 = fromPos.x;
        const y1 = fromPos.y;
        const x2 = toPos.x;
        const y2 = toPos.y;

        const pathData = generateBezierPath(x1, y1, x2, y2);
        lineInfo.path.setAttribute('d', pathData);
      }
    });
  }

  function copyTextUpTo(block){
    let textContent = copyPrecedingText(block, "");
    navigator.clipboard.writeText(textContent);
  }

  function copyPrecedingText(block, text){
    for (let i = lines.length - 1; i >= 0; i--) {
      let lineInfo = lines[i];
      if (lineInfo.to === block) {
        let blockOrSubblock = lineInfo.from;
        let fromBlock = blockOrSubblock.closest('.block');
        if (block.dataset.blocktype == 0){
          let textElement = block.querySelector('.ql-editor').innerText;
          return copyPrecedingText(fromBlock, '\n\n' + textElement + text);
        } else {
          return copyPrecedingText(fromBlock, text);
        }
      }
    }

    return text;
  }

  function deleteSubBlock(subBlock, blockData) {
    // Remove any links involving this sub-block
    for (let i = lines.length - 1; i >= 0; i--) {
      let lineInfo = lines[i];
      if (lineInfo.from === subBlock || lineInfo.to === subBlock) {
        svgCanvas.removeChild(lineInfo.path);
        lines.splice(i, 1);
      }
    }
    // Remove sub-block data
    const subBlockIndex = getSubBlockIndex(subBlock);
    blockData.subBlocks.splice(subBlockIndex, 1);

    // Remove sub-block from DOM
    subBlock.parentNode.removeChild(subBlock);
    updateCanvasSize(); // Adjust canvas size
  }

  function deleteBlock(block) {
    const blockId = block.dataset.blockId;
    // Remove any links from or to this block or its sub-blocks
    const elementsToRemoveLinks = [block];

    // Add sub-blocks to elements to remove links from
    const subBlocks = block.querySelectorAll('.sub-block');
    subBlocks.forEach((subBlock) => {
      elementsToRemoveLinks.push(subBlock);
    });

    for (let i = lines.length - 1; i >= 0; i--) {
      let lineInfo = lines[i];
      if (
        elementsToRemoveLinks.includes(lineInfo.from) ||
        elementsToRemoveLinks.includes(lineInfo.to)
      ) {
        // Remove the line from SVG
        svgCanvas.removeChild(lineInfo.path);
        // Remove the line from the lines array
        lines.splice(i, 1);
      }
    }

    // Remove block data
    const blockDataIndex = blocksData.findIndex(b => b.id == blockId);
    if (blockDataIndex !== -1) {
      blocksData.splice(blockDataIndex, 1);
    }

    // Remove block from DOM
    block.parentNode.removeChild(block);
    updateCanvasSize(); // Adjust canvas size
  }

  function exportToJSON() {
    
    let title = titleInput.value.replace(/\s+/g, '_');
    if (titleInput.value.replace(/\s+/g, '') == "") title = "Untitled";

    data = {
      title: title,
      blocksData: blocksData
    };
    wrapper = {data};
    const jsonData = JSON.stringify(wrapper, null, 2);
    //const jsonString = "var storyGraphData = \"" + encodeURIComponent(jsonData) + "\"";

    try {
      const { ipcRenderer } = require('electron');
      ipcRenderer.invoke('show-save-dialog', title, jsonData);
      return;
    } catch {}

    
    // For demonstration, we'll log it to the console
    // Alternatively, display it in a new window or download it
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${title}_Data.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    /*
    const dataStrJavascript = "data:text/javascript;charset=utf-8," + encodeURIComponent(jsonString);
    const downloadAnchorNodeJavascript = document.createElement('a');
    downloadAnchorNodeJavascript.setAttribute("href", dataStrJavascript);
    downloadAnchorNodeJavascript.setAttribute("download", `${title}_Data.inimice`);
    document.body.appendChild(downloadAnchorNodeJavascript); // required for firefox
    downloadAnchorNodeJavascript.click();
    downloadAnchorNodeJavascript.remove();
    */
  }

  function updateAllLines() {
    lines.forEach((lineInfo) => {
      const fromPos = getElementPosition(lineInfo.from, 'from');
      const toPos = getElementPosition(lineInfo.to, 'to');
      const x1 = fromPos.x;
      const y1 = fromPos.y;
      const x2 = toPos.x;
      const y2 = toPos.y;

      const pathData = generateBezierPath(x1, y1, x2, y2);
      lineInfo.path.setAttribute('d', pathData);
    });
  }

  function importFromJSON(jsonData, isJson=true) {
    // Clear existing blocks and lines
    blocksData.length = 0; // Clear blocksData array
    lines.length = 0; // Clear lines array
    svgCanvas.innerHTML = ''; // Remove SVG lines
    // Re-add arrowhead definition
    svgCanvas.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="gray" />
        </marker>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#2e2e2e" stroke-width="1" />
        </pattern>
      </defs>
      <rect id="grid_background" x=-25000 y=-25000 width="50000px" height="50000px" fill="url(#grid)" />

    `;
    canvasContainer.querySelectorAll('.block').forEach(block => block.remove()); // Remove blocks from DOM
    
    if (!isJson){
      eval(jsonData);
      jsonData = decodeURIComponent(storyGraphData);
    }
    const parsedData = JSON.parse(jsonData);


    titleInput.value = parsedData.data.title;
    importedData = parsedData.data.blocksData;

    // Reset blockIdCounter
    blockIdCounter = 0;

    // Create blocks from imported data
    importedData.forEach(blockData => {
      // Ensure position exists
      if (!blockData.position) {
        blockData.position = { x: 100 + blockData.id * 20, y: 100 + blockData.id * 20 }; // Stagger positions
      }
      createBlock(blockData.position.x, blockData.position.y, blockData, blockData.blocktype);
    });

    // Recreate links
    setTimeout(() => {
      // Delay to ensure blocks are rendered before creating links
      importedData.forEach(blockData => {
        const sourceBlock = document.querySelector(`[data-block-id='${blockData.id}']`);

        // Create block-level link if any
        if (blockData.linkTo !== null) {
          const targetBlock = document.querySelector(`[data-block-id='${blockData.linkTo}']`);
          if (targetBlock) {
            createLink(sourceBlock, targetBlock);
          }
        }

        // Create sub-block links
        blockData.subBlocks.forEach((subBlockData, index) => {
          if (subBlockData.linkTo !== null) {
            const subBlock = getSubBlockByIndex(sourceBlock, index);
            const targetBlock = document.querySelector(`[data-block-id='${subBlockData.linkTo}']`);
            if (subBlock && targetBlock) {
              createLink(subBlock, targetBlock);
            }
          }
        });
      });
      updateCanvasSize(); // Adjust canvas size after import

      setTimeout(() => {
        document.querySelectorAll('.textarea').forEach(textarea => {
          autoResizeTextarea(textarea);
        });
        // Update all lines after textareas have resized
        updateAllLines();
      }, 0);
    }, 0);
  }

  function createLink(fromElement, toElement) {
    const fromPos = getElementPosition(fromElement, 'from');
    const toPos = getElementPosition(toElement, 'to');
    const x1 = fromPos.x;
    const y1 = fromPos.y;
    const x2 = toPos.x;
    const y2 = toPos.y;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = generateBezierPath(x1, y1, x2, y2);
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', 'gray');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)'); // Add arrowhead

    svgCanvas.appendChild(path);

    const lineInfo = {
      path: path,
      from: fromElement,
      to: toElement,
    };
    lines.push(lineInfo);
  }

  function getSubBlockIndex(subBlock) {
    const subBlocks = Array.from(subBlock.parentNode.querySelectorAll('.sub-block'));
    return subBlocks.indexOf(subBlock);
  }

  function getSubBlockByIndex(blockElement, index) {
    const subBlocks = Array.from(blockElement.querySelectorAll('.sub-block'));
    return subBlocks[index];
  }

  function updateCanvasSize() {
    return;
    const blocks = document.querySelectorAll('.block');
    let maxX = 0;
    let maxY = 0;
    blocks.forEach(block => {
      const x = parseInt(block.style.left, 10) + block.offsetWidth;
      const y = parseInt(block.style.top, 10) + block.offsetHeight;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    canvasContainer.style.width = maxX*scale + 'px';
    canvasContainer.style.height = maxY*scale + 'px';

    svgCanvas.setAttribute('width', maxX);
    svgCanvas.setAttribute('height', maxY);
  }

  document.addEventListener("paste", (event) => {
    return;

    if (Boolean(event.target.closest('.textarea')) || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT'){
      return;
    }
    event.preventDefault();

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = -panX + centerX - 200;
    const dy = -panY + centerY;

    let paste = (event.clipboardData || window.clipboardData).getData("text");

    createBlock(dx, dy, null, 0, default_text = paste);

    setTimeout(() => {
      document.querySelectorAll('textarea').forEach(textarea => {
        autoResizeTextarea(textarea);
      });
      updateAllLines();
    }, 0);
  });

  document.addEventListener('keydown', function(event) {
    if (Boolean(event.target.closest('.textarea')) || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT'){
      return;
    }

    if (event.key.toLowerCase() === '1') {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = -panX + centerX - 200;
      const dy = -panY + centerY - 75;

      createBlock(dx, dy, null, 0);
      event.preventDefault();
    } else if (event.key.toLowerCase() === '2') {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = -panX + centerX - 200;
      const dy = -panY + centerY - 75;

      createBlock(dx, dy, null, 1);
      event.preventDefault();
    } else if (event.key.toLowerCase() === '3') {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = -panX + centerX - 200;
      const dy = -panY + centerY - 75;

      createBlock(dx, dy, null, 2);
      event.preventDefault();
    }
  });

  createBlock(0, 0, null, -1, "");
});
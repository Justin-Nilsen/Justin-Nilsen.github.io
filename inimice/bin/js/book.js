function adjustFilterHeight() {
    var filters = document.querySelectorAll('.grain-overlay');
    var bodyHeight = document.body.scrollHeight;
    for (const filter of filters) { filter.style.height = bodyHeight + 'px'; }
    
}
document.addEventListener('DOMContentLoaded', function() {

    //adjustFilterHeight();
    //window.addEventListener('resize', adjustFilterHeight);

    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
        console.log("YES!");
        parent.closeIFrame();
        }
    });

    /*
    let bookWidth = screen.width * 0.9 * 2.0;
    let pageWidth = bookWidth/2;
    let bookHeight = (pageWidth*11.0)/8.5;
    */

    let bookHeight = screen.height * 0.7;
    let bookWidth = (8.5*bookHeight*2.0)/11.0;
    let pageWidth = bookWidth/2;
    
    let scaleFactor = pageWidth/750.0;

    console.log(screen.height);
    console.log(screen.width);

    function setBookVars() {
        // Set the value of variable --blue to another value (in this case "lightblue")
        var r = document.querySelector(':root');
        r.style.setProperty('--book-width', `${bookWidth}px`);
        r.style.setProperty('--book-height', `${bookHeight}px`);
        r.style.setProperty('--page-width', `${pageWidth}px`);
        r.style.setProperty('--scale-factor', `${scaleFactor}`)
    }

    setBookVars();

    $("#flipbook").turn({
        gradients: true,
        display: "double",
        width: bookWidth, //1024, // 1500
        height: bookHeight //662 //970,
    });

    $("#flipbook").addClass('animated');

   //document.body.style.zoom = `${ height/1440 * 100}%`;
});
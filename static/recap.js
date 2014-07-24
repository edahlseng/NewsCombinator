var player;
var currentRenderObject;
var hideControlsTimer;

// we want these variables to be public because we will access these elements frequently.
// we don't want them to be computed each time they are needed
var progressSlider;
var sliderPosition;
var loadingLogo
var clockMinuteHand
var clockHourHand


function verticallyCenter()
{
    //get window height
    var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight|| e.clientHeight|| g.clientHeight
        title = document.getElementById('timeSelectionContainer');

    if ((y - title.clientHeight) > 0) {
            value = ((y - title.clientHeight)/2)
            title.setAttribute("style", "margin-top:" + value.toString() + "px");
        }

    console.log("verticallyCenter");
}
// window.onresize = verticallyCenter;

function timeSelected()
{
	if (player)
	{
		// if a video is already playing we should pause it while we prepare and load the next videos
		delete player;
		player = undefined;

		// remove any currently existing video elements
		videoContainer = document.getElementById('um_video_player_wrapper');
		while (videoContainer.hasChildNodes()) {
			videoContainer.removeChild(videoContainer.lastChild);
		}

	}

	var timeRequested = event.target.id;
	var request = new XMLHttpRequest();
	request.onload = setupVideoPlayer;

	var queryString = '?t=' + timeRequested;
	request.open('GET', '/renderObjectForTimeAvailable' + queryString, true); // request a renderObject from the server
	request.send();
}

function setupVideoPlayer()
{
	var response = JSON.parse(this.responseText);
	if (response.errorCode != 0)
	{
		// there was an error
		return;
	}
	
	currentRenderObject = response.renderObject;

	// ----------------------
	// create thumbnails
	// ----------------------
	var playlistContainer = document.getElementById('playlistContainer');
	for (var i = 0; i < currentRenderObject.EDL.length; i++)
	{
		var thumbnail = document.createElement('img');
		thumbnail.setAttribute('src', currentRenderObject.EDL[i].thumbnail);

		var title = document.createElement('p');
		title.textContent = currentRenderObject.EDL[i].title;

		var thumbnailContainer = document.createElement('div');
		thumbnailContainer.setAttribute('class', 'thumbnailContainer');
		thumbnailContainer.appendChild(thumbnail);
		thumbnailContainer.appendChild(title);

		var clipElement = document.createElement('div');
		clipElement.setAttribute('class', 'video');
		clipElement.setAttribute('id', 'clip' + i);
        clipElement.setAttribute('title', currentRenderObject.EDL[i].trend)
		clipElement.style.width = (100.0 / (currentRenderObject.EDL.length)) + '%';
		clipElement.appendChild(thumbnailContainer);
		clipElement.addEventListener('click', clipClicked);

		playlistContainer.appendChild(clipElement);

	}

	// ----------------------
	// load video player
	// ----------------------
    function videoReadyHandler() {        
        // fade into the proper display situation
        var timeSelectionContainer = document.getElementById('timeSelectionContainer');
        var descriptionContainer = document.getElementById('descriptionContainer');
        var temporaryBackground = document.getElementById('temporaryBackground');
        var controlsContainer = document.getElementById('controlsContainer');
        loadingLogo = document.getElementById('loadingLogo');
        clockMinuteHand = document.getElementById('clockMinuteHand');
        clockHourHand = document.getElementById('clockHourHand');
        progressSlider = document.getElementById('progressSlider');
        sliderPosition = document.getElementById('sliderPosition');

        timeSelectionContainer.style.webkitTransition = "max-width 1s, margin 1s, opacity .4s, visibility 1s";
        // descriptionContainer.style.webkitTransition = "height 1s, opacity 1s";

        clockMinuteHand.style.webkitAnimationPlayState = 'paused';
        clockHourHand.style.webkitAnimationPlayState = 'paused';

        // timeSelectionContainer.style.maxWidth = "100%";
        timeSelectionContainer.style.marginTop = "0";
        timeSelectionContainer.style.padding = "0";
        timeSelectionContainer.style.webkitTransform = "translateY(0%)";
        descriptionContainer.style.height = 0;
        descriptionContainer.style.opacity = 0;
        timeButtonContainer.style.background = "rgba(0,0,0,.5)";

        temporaryBackground.style.opacity = 0;
        temporaryBackground.style.visibility = "hidden";
        controlsContainer.style.visibility = "visible";
        controlsContainer.style.opacity = 1;
        loadingLogo.style.opacity = 0;
        loadingLogo.style.visibility = 'hidden';

        // start the video
		player.play();

        //load tooltips
        $( document ).tooltip();
		
		// start the timer for hiding all of the unwanted controls
		mouseMove();
    }

    function finishedHandler() {
        mouseMove();
    }

    function loadingStartedHandler() {
        if (loadingLogo.style.visibility = 'hidden')
        {
            clockMinuteHand.style.webkitAnimationPlayState = 'running';
            clockHourHand.style.webkitAnimationPlayState = 'running';
            loadingLogo.style.visibility = 'visible';
            loadingLogo.style.opacity = 1;
        }
    }

    function loadingStoppedHandler() {
        if (loadingLogo.style.visibility = 'visible')
        {
            clockMinuteHand.style.webkitAnimationPlayState = 'paused';
            clockHourHand.style.webkitAnimationPlayState = 'paused';
            loadingLogo.style.visibility = 'hidden';
            loadingLogo.style.opacity = 0;
        }
    }

    function playHandler() {
    	var playedElement = document.getElementById('played');
    	playedElement.style.webkitTransition = "";
    	playedElement.style.opacity = 1;
    	playedElement.style.visibility = "visible";
    	playedElement.style.webkitTransition = "opacity .3s, visibility .3s";
    	
    	setTimeout(function() {
    		playedElement.style.opacity = 0;
    		playedElement.style.visibility = "hidden";
    	}, 1000);
    }

    function pauseHandler() {
    	var pausedElement = document.getElementById('paused');
    	pausedElement.style.webkitTransition = "";
    	pausedElement.style.opacity = 1;
    	pausedElement.style.visibility = "visible";
    	pausedElement.style.webkitTransition = "opacity .3s, visibility .3s";
    	
    	setTimeout(function() {
    		pausedElement.style.opacity = 0;
    		pausedElement.style.visibility = "hidden";
    	}, 1000);
    }

    function timeUpdateHandler() {
    	var percent = player.currentTime() / player.duration();
    	sliderPosition.style.left = (percent * (progressSlider.clientWidth - sliderPosition.clientWidth)) + 'px';
    }

    player = new UMVideoPlayer("um_video_player_wrapper", response.renderObject, {
        "transitionTime" : .3,
        "classString" : "um-videoPlayer",
        "autoReload" : false,
        "autoLoadDuration" : true,
        "finishedHandler" : finishedHandler,
        "loadingStartedHandler" : loadingStartedHandler,
        "loadingStoppedHandler" : loadingStoppedHandler,
        "playHandler" : playHandler,
        "pauseHandler" : pauseHandler,
        "timeUpdateHandler" : timeUpdateHandler,
        "videoReadyHandler" : videoReadyHandler, 
    });
	
	// start the loading animation
    var clockMinuteHand = document.getElementById('clockMinuteHand');
    var clockHourHand = document.getElementById('clockHourHand');
    var loadingLogo = document.getElementById('loadingLogo');
    clockMinuteHand.style.webkitAnimationPlayState = 'running';
    clockHourHand.style.webkitAnimationPlayState = 'running';
    loadingLogo.style.visibility = 'visible';
    loadingLogo.style.opacity = 1;

    // hide the time selection controls
    var timeSelectionContainer = document.getElementById('timeSelectionContainer');
    timeSelectionContainer.style.opacity = 0;
}

function videoClicked()
{
	player.togglePlayPause();
	mouseMove();
}

function mouseMove()
{
	clearTimeout(hideControlsTimer);
	var timeSelectionContainer = document.getElementById('timeSelectionContainer');
	var controlsContainer = document.getElementById('controlsContainer');
	timeSelectionContainer.style.opacity = 1;
	controlsContainer.style.opacity = 1;
	timeSelectionContainer.style.visibility = "visible";
	controlsContainer.style.visibility = "visible";
	document.body.style.cursor = "auto";

	if (player && player.isVideoPlaying)
	{
		hideControlsTimer = setTimeout(function () {
			var containerToHide = document.getElementById('timeSelectionContainer');
			var secondContainerToHide = document.getElementById('controlsContainer');
			containerToHide.style.opacity = 0;
			secondContainerToHide.style.opacity = 0;
			containerToHide.style.visibility = "hidden";
			secondContainerToHide.style.visibility = "hidden";
			document.body.style.cursor = "none";
		}, 3000);
	}
}

function clipClicked(e)
{
	var clipIndex = parseInt(this.id.substring(4));
	player.seekToClipIndex(clipIndex);
}
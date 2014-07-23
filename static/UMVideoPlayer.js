// Suggestions for possible future enhancements:
//
// add support for a progress callback that indicates that more video content was loaded, along with a buffered property that represents the amount of video content that is buffered
// maybe some fullscreen support

function UMVideoPlayer(wrapperId, renderObject, options) {
    // helper variables
    var self = this;
    this.playerID = "UMVideoPlayer" + Math.round(Math.random() * (2000 - 1000) + 1000); // add a random number at the end in order to help prevent conflicting ID's with user defined elements
    
    // setup the container
    this.videoContainer = document.getElementById(wrapperId);

    // assign options if necessarry
    this.autoReload = true;
    if (options.autoReload != null && typeof(options.autoReload) == "boolean") {
        this.autoReload = options.autoReload;
    }

    this.classString = "";
    if (options.classString != null && typeof(options.classString) == "string") {
        this.classString = options.classString;
    }

    this.preloadAmount = 1;
    if (options.preloadAmount != null && typeof(options.preloadAmount) == "number") {
        this.preloadAmount = Math.max(1, Math.round(options.preloadAmount));
    }

    this.transitionTime = 0;
    if (options.transitionTime != null && typeof(options.transitionTime) == "number") {
        this.transitionTime = options.transitionTime;
    }

    // private helper objects
    this.renderObject = null;
    this.currentClipIndex = 0;
    this.isVideoReady = false;
    this.videoObjects = [];
    this.isPlaying = false;
    this.sendPlayEvent = true; // we set this to true because we want the initial play event to fire
    this.sendPauseEvent = false; // we set this to false because we don't know if the first pause will be done by the user or by the "system"
    this.durationLoadingVideo = null; // we use this variable to hold videos that we are only loading metadata for in order to calculate the total duration
    this._duration;
    this.loading = false;


    // assign event handlers
    this.clipStartedHandler = options.clipStartedHandler;
    this.durationLoadedHandler = options.durationLoadedHandler;
    this.finishedHandler = options.finishedHandler;
    this.loadingErrorHandler = options.loadingErrorHandler;
    this.loadingStartedHandler = options.loadingStartedHandler;
    this.loadingStoppedHandler = options.loadingStoppedHandler;
    this.playHandler = options.playHandler;
    this.pauseHandler = options.pauseHandler;
    this.timeUpdateHandler = options.timeUpdateHandler;
    this.videoReadyHandler = options.videoReadyHandler;


    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (self.isVideoReady) {
            self.sendPlayEvent = true;
            self.videoObjects[self.currentClipIndex].style.opacity = "1";
            self.videoObjects[self.currentClipIndex].play();
            this.isPlaying = true;
        } else {
            this.loadingErrorHandler("video not ready");
        }

    }

    this.pause = function () {
        if (!this.videoObjects[self.currentClipIndex].paused) {
            self.sendPauseEvent = true;
            this.videoObjects[self.currentClipIndex].pause();
        }
        if ((self.currentClipIndex + 1) < self.videoObjects.length) {
            // sometimes the user will try to pause right in the middle of a transition, so we should make sure that the next video is also paused
            if(!this.videoObjects[self.currentClipIndex + 1].paused) {
                this.videoObjects[self.currentClipIndex + 1].pause();
            }
        }
        this.isPlaying = false;
    }

    this.togglePlayPause = function () {
        if (this.isPlaying)
        {
            self.pause();
        }
        else
        {
            self.play();
        }
    }

    this.loadDuration = function () {
        for (var i = 0; i < self.renderObject.EDL.length; i++) {
            if (!self.renderObject.EDL[i].endTime) {                
                self.durationLoadingVideo = createVideo(i, "metadata");
                return; // return so that we don't call onDurationLoaded                
            }
        }

        self.onDurationLoaded();
    }

    this.duration = function() {
        if (!self._duration)
        {
            var duration = 0; 
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                var endTime;
                if (self.renderObject.EDL[i].endTime)
                {
                    endTime = self.renderObject.EDL[i].endTime;
                }
                else {
                    console.log('ERROR: duration has not yet been calculated.  You must first call player.loadDuration(), or set the "automatically loads duration" option to true when creating the player object.');
                    return null;
                }

                var startTime = 0;
                if (self.renderObject.EDL[i].startTime)
                {
                    startTime = self.renderObject.EDL[i].startTime;
                }

                duration += endTime - startTime;
            }
            self._duration = duration;
        }

        return self._duration;
    }

    this.currentTime = function () {
        var previousDuration = 0;
        for (var i = 0; i < self.currentClipIndex; i++)
        {
            var startTime = self.renderObject.EDL[i].startTime ? self.renderObject.EDL[i].startTime : 0;

            if (!self.renderObject.EDL[i].endTime) {
                console.log('ERROR trying to determine current time');
                return null;
            }

            var endTime = self.renderObject.EDL[i].endTime;

            previousDuration += (endTime - startTime);
        }

        var clipStart = self.renderObject.EDL[self.currentClipIndex].startTime ? self.renderObject.EDL[self.currentClipIndex].startTime : 0;
        return previousDuration + (self.videoObjects[self.currentClipIndex].currentTime - clipStart);
    }

    this.seekToSeconds = function(desiredSeconds) {
        // check to see if the seek is possible, and whether it is a valid request or not
        var duration = self.duration();
        if (duration != null)
        {
            if (desiredSeconds < 0 || desiredSeconds > duration)
            {
                console.log("Requested seek time is out of range");
                return;
            }
        } else {
            console.log("A SeekToSeconds request cannot be made until the duration has been loaded.")
            return;
        }
        
        // determine what clip the desired seconds are in
        var currentCalculatedDuration = 0;
        var desiredClipIndex;
        for (var i = 0; i < self.renderObject.EDL.length; i++)
        {
            var startTime = self.renderObject.EDL[i].startTime ? self.renderObject.EDL[i].startTime : 0;
            var clipLength = (self.renderObject.EDL[i].endTime - startTime);

            if (desiredSeconds < (currentCalculatedDuration + clipLength)) {
                desiredClipIndex = i;
                break;
            }

            currentCalculatedDuration += clipLength;
        }

        // check to make sure that we (hopefully) correctly determined the clip to seek to
        if (desiredClipIndex == null) {
            console.log("ERROR attempting to seek to requested time");
            return;
        }

        // determine what time in the desired clip we must seek to
        var desiredClipTime = desiredSeconds - currentCalculatedDuration;
        desiredClipTime += self.renderObject.EDL[desiredClipIndex].startTime ? self.renderObject.EDL[desiredClipIndex].startTime : 0;

        // if the requested index is the currently playing video, just reset the time to the start time
        if (desiredClipIndex == self.currentClipIndex)
        {
            self.videoObjects[desiredClipIndex].currentTime = desiredClipTime;
            
        }
        else
        {
            self.currentClipIndex = desiredClipIndex;

            // remove all videos from the container
            while (self.videoContainer.lastChild) {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }

            // dispose of video elements that came before the desired clipIndex
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                if(i < clipIndex || !self.videoObjects[i] || self.videoObjects[i].readyState < 4) {
                    self.videoObjects[i] = null;
                }
            }

            // load the initial videos
            self.loadInitialElementsStartingAt(desiredClipIndex);

            // set the seek time, and show the first video element
            self.videoObjects[desiredClipIndex].currentTime = desiredClipTime;
            self.videoObjects[desiredClipIndex].style.opacity = 1;

            // in the event that the desired video element already existed, we may need to start it
            // a ready state of 4 means that the video element has loaded enough data to start playing
            if (self.isPlaying && self.videoObjects[clipIndex].readyState == 4 && self.videoObjects[clipIndex].paused) {
                self.videoObjects[clipIndex].play();
            }
        }
    }

    this.seekToClipIndex = function(clipIndex) {
        // check to see if the seek request is valid or no
        if (clipIndex < 0 || clipIndex >= self.renderObject.EDL.length)
        {
            console.log("Requested index out of range");
            return;
        }
        
        // if the requested index is the currently playing video, just reset the time to the start time
        if (clipIndex == self.currentClipIndex)
        {
            var startTime = self.renderObject.EDL[clipIndex].startTime ? self.renderObject.EDL[clipIndex].startTime : 0;

            self.videoObjects[clipIndex].currentTime = startTime;
        }
        else
        {
            self.currentClipIndex = clipIndex;

            // remove all videos from the container
            while (self.videoContainer.lastChild) {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }

            // dispose of video elements that came before the desired clipIndex
            for (var i = 0; i < self.renderObject.EDL.length; i++) {
                if(i < clipIndex || !self.videoObjects[i] || self.videoObjects[i].readyState < 4) {
                    self.videoObjects[i] = null;
                }
            }

            // load the initial video elements, show the first video element
            self.loadInitialElementsStartingAt(clipIndex);
            self.videoObjects[clipIndex].style.opacity = 1;

            // in the event that the desired video element already existed, we may need to start it
            // a ready state of 4 means that the video element has loaded enough data to start playing
            if (self.isPlaying && self.videoObjects[clipIndex].readyState == 4 && self.videoObjects[clipIndex].paused) {
                self.videoObjects[clipIndex].play();
            }
        }
    }

    // =================================================
    // "private" methods
    // =================================================

    this.createVideo = function(clipIndex, preloadStyle) {

        var content = this.renderObject.EDL[clipIndex];

        var videoElement = document.createElement('video');
        videoElement.setAttribute('id', self.playerID + "-" + clipIndex);
        videoElement.setAttribute('class', self.classString);

        var timeString = "#t=";
        timeString += content.startTime;
        if (content.endTime) {
            timeString += "," + content.endTime;
        }
        if (timeString == "#t=") {
            timeString = "";
        }
        videoElement.setAttribute('src', content.url + timeString);

        preloadStyle = (typeof preloadStyle == "undefined") ? "auto" : preloadStyle;
        videoElement.setAttribute('preload', preloadStyle);

        videoElement.style.position = "absolute";
        videoElement.style.opacity = "0";

        videoElement.addEventListener("canplay", self.onCanPlay);
        videoElement.addEventListener("durationchange", self.onDurationChange);
        videoElement.addEventListener("loadeddata", self.onLoadedData);
        videoElement.addEventListener("loadedmetadata", self.onLoadedMetadata);
        videoElement.addEventListener("loadstart", self.onLoadStart);
        videoElement.addEventListener("play", self.onPlay);
        videoElement.addEventListener("pause", self.onPause);
        videoElement.addEventListener("timeupdate", self.onTimeUpdate);

        return videoElement;
    }  

    this.loadInitialElementsStartingAt = function(clipIndex)
    {
        var maxIndex = Math.min(self.renderObject.EDL.length, clipIndex + self.preloadAmount + 1);

        // make sure that all video elements have been removed from the container
        while (self.videoContainer.lastChild) {
            self.videoContainer.removeChild(self.videoContainer.lastChild);
        }

        // create the video object if it has not already been created
        // in the event of seeking, the video object might have been previously created
        for (var i = clipIndex; i < maxIndex; i++) {
            if (!self.videoObjects[i]) {
                self.videoObjects[i] = self.createVideo(i);
            }
        }

        // add the video elements to the container in the correct order
        for (var i = clipIndex; i < maxIndex; i++) {
            self.videoContainer.insertBefore(self.videoObjects[i], self.videoContainer.firstChild);
        }
    }

    this.onClipStartedHandler = function() {
        if (self.clipStartedHandler) {
            self.clipStartedHandler();
        }
    }

    this.onDurationLoaded = function() {
        if (self.durationLoadedHandler) {
            self.durationLoadedHandler.call(this);
        }
    }

    this.onLoadingStarted = function() {
        self.loading = true;
        if (self.loadingStartedHandler) {
            self.loadingStartedHandler();
        }
    }

    this.onLoadingStopped = function() {
        if (self.loading)
        {
            self.loading = false;
            if (self.loadingStoppedHandler) {
                self.loadingStoppedHandler();
            }
        }
    }

    // =================================
    // internal video element callbacks
    // =================================

    this.onCanPlay = function() {
        if (this == self.videoObjects[self.currentClipIndex]) {
            self.onLoadingStopped();
        }

        // if we were seeking to the clip, and we were previously playing, we need to play it
        if (this == self.videoObjects[self.currentClipIndex] && self.isPlaying) {
            self.videoObjects[self.currentClipIndex].play();
        }
    }

    this.onDurationChange = function() {
        // add the duration to the endTime of the render object, whether or not we are trying to get the duration of the whole video
        var elementID = this.id;
        var clipID = parseInt(elementID.replace(self.playerID + "-", ""));

        if (this.duration && !self.renderObject.EDL[clipID].endTime) {
            self.renderObject.EDL[clipID].endTime = this.duration;
        }

        // check to see if the purpose of this video is to just grab the duration
        if (this == self.durationLoadingVideo)
        {
            // check to see if we might need to load the duration for another clip
            if (clipID != (self.renderObject.EDL.length - 1))
            {
                // go throught and create the next video to load metadata
                for (var i = 0; i < self.renderObject.EDL.length; i++)
                {
                    if (!self.renderObject.EDL[i].endTime)
                    {
                        self.durationLoadingVideo = createVideo(i, "metadata");
                        return; // return so that we don't call onDurationLoaded
                    }

                }
            }
            
            delete self.durationLoadingVideo;
            self.durationLoadingVideo = null;
            self.onDurationLoaded();
        }
    }

    this.onLoadedData = function() {
        if (this == self.videoObjects[0]) {
            self.isVideoReady = true;
            document.getElementById(self.playerID + "-" + self.currentClipIndex).style.opacity = "1";
            if (self.videoReadyHandler) {
                self.videoReadyHandler();
            }
        }
    }

    this.onLoadedMetadata = function() {
        var elementID = this.id;
        var clipID = parseInt(elementID.replace(self.playerID + "-", ""));

        if (clipID == null || clipID < 0) {
            self.loadingErrorHandler("Something is wrong with a video element...");
            return;
        }

    }

    this.onLoadStart = function() {
        if (this == self.videoObjects[self.currentClipIndex]) {
            self.onLoadingStarted();
        }
    }

    this.onPlay = function() {
        self.onLoadingStopped();
        if (self.playHandler && self.sendPlayEvent) {
            self.playHandler.call(self);
        }
        self.sendPlayEvent = false;
    }

    this.onPause = function() {
        // this function is called when the user pauses, when the video reaches the point in time when it is supposed to stop, or when it reaches the end of the video

        if (self.pauseHandler && self.sendPauseEvent) {
            self.pauseHandler.call(self);
        }
        self.sendPauseEvent = false;

        var clipIndex = parseInt(this.id.replace(self.playerID + "-", ""));
        if (self.renderObject.EDL[clipIndex].endTime <= this.currentTime)
        {
            this.style.opacity = "0"; 
            this.remove();
            self.videoObjects[self.currentClipIndex] = null; // with a large number of videos, if we don't do this then the video playback will eventually start to hitch

            self.currentClipIndex++;

            if (self.renderObject.EDL.length > self.currentClipIndex) {
                self.videoObjects[self.currentClipIndex].style.opacity = "1";
                self.videoObjects[self.currentClipIndex].play();

                var preloadIndex = self.currentClipIndex + self.preloadAmount;
                if (self.renderObject.EDL.length > preloadIndex) {
                    if (!self.videoObjects[preloadIndex]) {
                        self.videoObjects[preloadIndex] = self.createVideo(preloadIndex);
                    }
                    self.videoContainer.insertBefore(self.videoObjects[preloadIndex], self.videoContainer.firstChild);
                }

            }
            else {
                self.isPlaying = false;
                if (self.finishedHandler) {
                    self.finishedHandler();
                }
                if (self.autoReload)
                {
                    self.loadInitialElementsStartingAt(0);
                }
                
            }

        }
    }

    this.onTimeUpdate = function() {
        // check if we should begin to fade out the currently playing video
        // only start the fade if the user requested a transition time, and we haven't already started the fade
        if (self.transitionTime > 0 && self.videoObjects[self.currentClipIndex].opacity != 0)
        { 
            var end = self.renderObject.EDL[self.currentClipIndex] ? self.renderObject.EDL[self.currentClipIndex].endTime : this.duration;
            if ((end - self.videoObjects[self.currentClipIndex].currentTime) < self.transitionTime)
            {
                self.videoObjects[self.currentClipIndex].style.webkitTransition = "opacity " + self.transitionTime + "s";
                self.videoObjects[self.currentClipIndex].style.opacity = 0;
            }
        }

        if (self.timeUpdateHandler) {
            self.timeUpdateHandler.call(self);
        }
    }

    // --------------------------------------------------------------------------------------------------
    // Load the video.
    // This section must come at the end, so that the methods that are referenced are defined beforehand.
    // ==================================================================================================

    this.renderObject = renderObject;

    if (this.renderObject == null) {
        this.loadingErrorHandler("Invalid Render Object");
        return;
    }

    if (options.autoLoadDuration) {
        this.loadDuration();
    }

    this.loadInitialElementsStartingAt(0);
}

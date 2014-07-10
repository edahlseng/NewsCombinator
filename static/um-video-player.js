// TODO:
//
// future: better support for transitions, 
// adding support for a scrubber through the whole concat ro
// etc.
// fullscreen support
// better controls


function UMVideoPlayer(wrapperId, renderObject, options) {
    //to note: clips 1 sec or less experience a delay, need to optimize.
    //option to load X number of videos in advance to adjust accordingly

    var self = this;

    this.videoContainer = document.getElementById(wrapperId);

    //options
    this.onReady = options.onReady;
    this.onLoadError = options.onLoadError;
    this.onRenderObjectTimeUpdate = options.onRenderObjectTimeUpdate;
    this.onFinish = options.onFinish;
    this.playHandler = options.playHandler;
    this.pauseHandler = options.pauseHandler;

    this.transitionTime = 0;
    if (options.transitionTime != null && typeof(options.transitionTime) == "number") {
        this.transitionTime = options.transitionTime;
    }

    this.classString = ""; //option= additional class tags
    if (options.classString != null && typeof(options.classString) == "string") {
        this.classString = options.classString;
    }

    this.autoReload = true;
    if (options.autoReload != null && typeof(options.autoReload) == "boolean") {
        this.autoReload = options.autoReload;
    }

    this.renderObj = null; // change to renderObject naming
    this.currentVideoIndex = 0; // change to currentClipIndex
    this.isVideoReady = false;
    this.videoObjects = [];
    this.renderObjectTime = 0;
    this.contentTime = [];
    this.isVideoPlaying = false; // change name to isPlaying
    this.sendPlayEvent = true; // we set this to true because we want the initial play event to fire
    this.sendPauseEvent = false; // we set this to false because we don't know if the first pause will be done by the user or by the "system"

    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (self.isVideoReady) {
            self.sendPlayEvent = true;
            self.videoObjects[self.currentVideoIndex].style.opacity = "1";
            self.videoObjects[self.currentVideoIndex].play();
            this.isVideoPlaying = true;
        } else {
            this.onLoadError("video not ready");
        }

    }

    this.pause = function () {
        if (!this.videoObjects[self.currentVideoIndex].paused) {
            self.sendPauseEvent = true;
            this.videoObjects[self.currentVideoIndex].pause();
        }
        if ((self.currentVideoIndex + 1) < self.videoObjects.length) {
            // sometimes the user will try to pause right in the middle of a transition, so we should make sure that the next video is also paused
            if(!this.videoObjects[self.currentVideoIndex + 1].paused) {
                this.videoObjects[self.currentVideoIndex + 1].pause();
            }
        }
        this.isVideoPlaying = false;
    }

    this.togglePlayPause = function () {
        if (this.isVideoPlaying)
        {
            self.pause();
        }
        else
        {
            self.play();
        }
    }

    this.duration = function() {
        // TODO:
        //
        // implement this method
    }

    this.currentTime = function () {
        // return this.renderObjectTime;
        // TODO:
        //
        // implement this method
    }

    this.seekToTime = function(time) {
        // TODO:
        //
        // implement this method
    }

    this.seekToClipIndex = function(clipIndex) {
        if (clipIndex < 0 || clipIndex >= self.renderObj.EDL.length)
        {
            console.log("Requested index out of range");
            return;
        }
        
        // if the requested index is the currently playing video, just reset the time to the start time
        if (clipIndex == self.currentVideoIndex)
        {
            var videoElement = this.videoObjects[clipIndex];
            var startTime = 0;
            if (self.renderObj.EDL[clipIndex].startTime)
            {
                startTime = self.renderObj.EDL[clipIndex].startTime;
            }
            videoElement.currentTime = startTime;
            // we might need to play here...
        }
        else
        {
            self.currentVideoIndex = clipIndex;

            //else, remove all videos, load the clip that we want
            while (self.videoContainer.lastChild)
            {
                self.videoContainer.removeChild(self.videoContainer.lastChild);
            }

            for (var i = clipIndex; i < self.renderObj.EDL.length; i++) {
                self.videoObjects[i].style.opacity = 0;
            };

            if (!self.videoObjects[clipIndex]) {
                self.createVideo[clipIndex];
            }
            self.videoContainer.insertBefore(self.videoObjects[clipIndex], self.videoContainer.firstChild);
            if ((clipIndex + 1) < self.videoObjects.length) {
                if (!self.videoObjects[clipIndex + 1]) {
                    self.createVideo[clipIndex + 1];
                }
                self.videoContainer.insertBefore(self.videoObjects[clipIndex + 1], self.videoContainer.firstChild);
            }

            self.videoObjects[clipIndex].style.opacity = 1;

            if (self.isVideoPlaying && videoId == self.currentVideoIndex)
            {
                // when seeking, we may need to play the first video element
                self.videoObjects[videoId].play();
            }
        }
    }

    // =================================================
    // "private" methods
    // =================================================

    this.generateId = function(num) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < num; i++ ) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    this.createVideo = function (clipIndex) {

        var content = this.renderObj.EDL[clipIndex];

        var videoElement = document.createElement('video');
        videoElement.setAttribute('id', "video-" + self.elementId + "-" + clipIndex);
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

        // videoElement.setAttribute('controls', true);
        videoElement.setAttribute('preload', "auto");

        videoElement.style.position = "absolute";
        videoElement.style.opacity = "0";
        videoElement.style.webkitTransition = self.transitionTime + "s";

        videoElement.addEventListener("loadedmetadata", self.onMetadataLoaded);
        videoElement.addEventListener("loadeddata", self.onVideoReady);
        videoElement.addEventListener("play", self.onPlay);
        videoElement.addEventListener("pause", self.onPause);
        videoElement.addEventListener("timeupdate", self.onTimeUpdate);

        self.videoObjects[clipIndex] = videoElement;
    }  


    // =================================
    // internal video element callbacks
    // =================================

    this.onMetadataLoaded = function() {
                
        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
        }

        // self.currentTime(self.renderObj.EDL[videoId].startTime);
        // self.contentTime[videoId] = self.renderObj.EDL[videoId].startTime;
    }

    this.onVideoReady = function() {

        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        console.log('element on video ready', videoId);

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
        }

        if (videoId == 0) {
            self.isVideoReady = true;
            document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex).style.opacity = "1";
            self.onReady();
        }
    }

    this.onPlay = function() {
        if (self.playHandler && self.sendPlayEvent)
        {
            self.playHandler();
        }
        self.sendPlayEvent = false;
    }

    this.onPause = function() {
        // this function is called when the video reaches the point in time when it is supposed to stop, or when it reaches the end of the video

        if (self.pauseHandler && self.sendPauseEvent)
        {
            self.pauseHandler();
        }
        self.sendPauseEvent = false;

        var videoId = parseInt(this.id.replace("video-" + self.elementId + "-", ""));
        if (self.renderObj.EDL[videoId].endTime <= this.currentTime)
        {
            this.style.opacity = "0"; 
            this.remove(); // should move to a transition handler
            self.videoObjects[self.currentVideoIndex] = null; // with a large number of videos, if we don't do this then the video playback will eventually start to hitch

            self.currentVideoIndex++;

            if (self.renderObj.EDL.length > self.currentVideoIndex) {
                self.videoObjects[self.currentVideoIndex].style.opacity = "1";
                self.videoObjects[self.currentVideoIndex].play();

                if (self.renderObj.EDL.length > self.currentVideoIndex + 1) {
                    if (!self.videoObjects[self.currentVideoIndex + 1]) {
                        self.createVideo(self.currentVideoIndex + 1);
                    }
                    self.videoContainer.insertBefore(self.videoObjects[self.currentVideoIndex + 1], self.videoContainer.firstChild);
                }

            }
            else {
                self.isVideoPlaying = false;
                if (self.onFinish) {
                    self.onFinish();
                }
                if (self.autoReload)
                {
                    // TODO:
                    // 
                    // implement this feature
                }
                
            }

        }
    }

    this.onTimeUpdate = function() {
        // TODO:
        // 
        // implement this
    }

    //--------------------------------------------------
    // I think that some of this might be able to be moved up before the methods

    this.renderObj = renderObject;

    if (this.renderObj == null) {
        this.onLoadError("Invalid Render Object");
        return;
    }

    for (var i = 0; i < 2; i++) {
        self.createVideo(i);
    };

    // I don't know if this can be moved up before the methods or not
    // this.loadVideoElement(0); // what is this for????
    self.videoContainer.insertBefore(self.videoObjects[0], self.videoContainer.firstChild);
    self.videoContainer.insertBefore(self.videoObjects[1], self.videoContainer.firstChild);

    //--------------------------------------------------
}

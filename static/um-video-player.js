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

    this.renderObj = null;
    this.currentVideoIndex = 0;
    this.isVideoReady = false;
    this.videoObjects = [];
    this.renderObjectTime = 0;
    this.contentTime = [];
    this.isVideoPlaying = false;

    // --------------------------------------------------
    // "public" methods
    // --------------------------------------------------

    this.play = function () {
        if (this.isVideoReady) {
            var videoElement = document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex);//.getAttribute("id");
            //console.log(videoElement);
            videoElement.style.opacity = "1";
            this.videoObjects[self.currentVideoIndex].play();
            this.isVideoPlaying = true;
        } else {
            this.onLoadError("video not ready");
        }
    }

    this.pause = function () {
        if (this.videoObjects[self.currentVideoIndex] != null) {
            if (!this.videoObjects[self.currentVideoIndex].paused) {
                this.videoObjects[self.currentVideoIndex].pause();
            }
            if (this.videoObjects[self.currentVideoIndex + 1]) {
                // sometimes the user will try to pause right in the middle of a transition, so we should make sure that the next video is also paused
                if(!this.videoObjects[self.currentVideoIndex + 1].paused) {
                    this.videoObjects[self.currentVideoIndex + 1].pause();
                }
            }
            this.isVideoPlaying = false;
        }
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
        return this.renderObjectTime;
    }

    this.seekToTime = function(time) {
        // TODO:
        //
        // implement this method
    }

    this.seekToClipIndex = function(clipIndex) {
        // TODO:
        // 
        // implement this method
    }

    // ----------------------------------
    // "private" methods
    // ----------------------------------

    this.generateId = function(num) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < num; i++ ) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return text;
    }

    this.loadInitialVideo = function () {

        this.currentVideoIndex = 0;
        this.isVideoReady = false;
        this.elementId = self.generateId(10);
        // this.renderObjectTime = 0;
        this.contentTime = new Array(this.renderObj.EDL.length);

        this.loadVideoElement(0);
    }

    this.loadVideoElement = function (id) {
        
        var content = this.renderObj.EDL[id];
        this.appendVideo(id, content.url, content.startTime, content.endTime); 

        if (this.renderObj.EDL.length > id + 1) {
            content = null;
            content = this.renderObj.EDL[id + 1];
            this.appendVideo(id + 1, content.url, content.startTime, content.endTime);
        }
    }

    this.appendVideo = function (id) {

        var content = this.renderObj.EDL[id];

        var videoElement = document.createElement('video');
        videoElement.setAttribute('id', "video-" + self.elementId + "-" + id);
        videoElement.setAttribute('class', self.classString);

        var timeString = "#t=";
        timeString += content.startTime;
        if (content.endTime)
        {
            timeString += "," + content.endTime;
        }
        if (timeString == "#t=")
        {
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

        this.videoObjects[id] = videoElement;
        this.contentTime[id] = 0;

        self.videoContainer.insertBefore(videoElement, self.videoContainer.firstChild);
    }    

    this.onMetadataLoaded = function() {
                
        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

        if (videoId == null || videoId < 0) {
            self.onLoadError("Something wrong with video element...");
            return;
        }

        self.currentTime(self.renderObj.EDL[videoId].startTime);
        self.contentTime[videoId] = self.renderObj.EDL[videoId].startTime;

    }



    this.onVideoReady = function() {

        var elementId = this.id;
        var videoId = parseInt(elementId.replace("video-" + self.elementId + "-", ""));

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
        console.log("onPlay");

    }

    this.onPause = function() {
        // this function is called when the video reaches the point in time when it is supposed to stop, or when it reaches the end of the video

        // console.log("onPause");
        // console.log ("currentVideoIndex = " + self.currentVideoIndex); 
        // console.log ("self.renderObj.EDL.length= " + self.renderObj.EDL.length);
        // console.log ("self.renderObj.EDL[self.currentVideoIndex].endTime= " + self.renderObj.EDL[self.currentVideoIndex].endTime); 
        // console.log ("this.currentTime = " + self.currentTime());
        // console.log ("video currentTime = " + document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex).currentTime);

        var videoElement = document.getElementById("video-" + self.elementId + "-" + self.currentVideoIndex);
        if (self.renderObj.EDL[self.currentVideoIndex].endTime <= videoElement.currentTime) {
 
            self.currentVideoIndex++;

            if (self.currentVideoIndex - 1 >= 0) {
                    //console.log("video being paused", self.currentVideoIndex - 1);
                    if (self.videoObjects[self.currentVideoIndex - 1] != null) {
                        self.videoObjects[self.currentVideoIndex - 1].pause();
                    }
                    self.videoObjects[self.currentVideoIndex - 1] = null;
                }
            this.remove();
            videoElement.style.opacity = "0"; 


            if (self.renderObj.EDL.length > self.currentVideoIndex) {
                var videoElement2 = document.querySelector("#video-" + self.elementId + "-" + self.currentVideoIndex);
                videoElement2.style.opacity = "1";
                self.videoObjects[self.currentVideoIndex].play();

                if (self.renderObj.EDL.length > self.currentVideoIndex + 1) {
                    var content = self.renderObj.EDL[self.currentVideoIndex + 1];
                    self.appendVideo(self.currentVideoIndex + 1, content.url, content.startTime, content.endTime);
                }

            }
            else {
                self.isVideoPlaying = false;
                if (self.onFinish) {
                    self.onFinish();
                }
                if (self.autoReload)
                {
                    self.loadInitialVideo();
                }
                
            }

        }
    }

    this.onTimeUpdate = function() {
        //future: better support for transitions, 
        //adding support for a scrubber through the whole concat ro
        //etc.
        //fullscreen support
        //better controls
    }

    //--------------------------------------------------

    this.renderObj = renderObject;

    if (this.renderObj == null) {
        this.onLoadError("Invalid Render Object");
        return;
    }

    this.loadInitialVideo();

    //--------------------------------------------------
}

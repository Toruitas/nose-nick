import {drawKeyPoints, drawSkeleton} from './utils'
import React, {Component} from 'react';
import styles from "./Game.module.css";
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';
import Rect from "./rectangle";
// import nickcage from "nickcage.jpg";


export class Game extends Component{
    // https://medium.com/@kirstenlindsmith/translating-posenet-into-react-js-58f438c8605d

    // React.js allows the static serving of default props. Then, if those static props are referenced in the
    // constructor’s call to super, they will become available in a way that is functionally analogous to global variables. 
    // This is how we can set (and easily alter) config variables like the videoWidth and videoHeight.
    // Stu's notes: But is this any better than State? Will experiment.
    static defaultProps = {
        videoWidth: 600,
        videoHeight: 400, 
        flipHorizontal: true,
        algorithm: 'single-pose',
        showVideo: false,
        showSkeleton: true,
        showPoints: true,
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
        maxPoseDetections: 2,
        nmsRadius: 20,
        outputStride: 16,
        imageScaleFactor: 0.5,
        skeletonColor: '#ffadea',
        skeletonLineWidth: 6,
        loadingText: 'Loading...please be patient...'
    }
    constructor(props){
        super(props, Game.defaultProps);
        this.state = {
            loading:true,
            firstDrawn:false,
            won:false
        };
        this.canvas = React.createRef();
        this.video = React.createRef();
        this.rectsPerRow = 6;
        this.rows = 4;
        this.untouchedRects = [];
        this.touchedRects = [];
        this.rectToTouch = "";
        this.startingTick = 0;
        this.timeLimit = 2000;
        this.noseLastXY = {x:0, y:0};
        // this.updateWglWithContext = this.updateWglWithContext.bind(this);
    }

    async componentDidMount(){
        try {
            await this.setupCamera();
        } catch (error){
            throw new Error(
                "This browser doesn't support video capture or just has no camera at all"
            )
        }

        try {
            this.posenet = await posenet.load();
        } catch(error){
            throw new Error("PoseNet failed to load")
        } finally {
            setTimeout(()=>{
                this.setState({loading:false})
            }, 200)
        }
        this.detectPose();

        // setInterval( async () => {
        //     await this.detectExpressionInRealTime(video);
        // }, 200)
    }

    componentDidUpdate(){}

    componentWillUnmount(){}

    async setupCamera(){
        if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
            throw new Error(
                "Browser API navigator.mediaDevices.getUserMedia not available"
            )
        }
    
        const {videoWidth, videoHeight} = this.props;
        const video = this.video.current;
        video.width = videoWidth;
        video.height = videoHeight;
    
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': {
                facingMode: 'user',
                width: videoWidth,
                height: videoHeight,
            },
        });
        video.srcObject = stream;
    
        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                resolve(video);
            }
        })
        
    }

    detectPose(){
        const {videoWidth, videoHeight} = this.props;
        const canvas = this.canvas.current;
        const canvasContext = canvas.getContext('2d');
        this.context = canvasContext;

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Draw the initial rectangles.
        // Put them into lists.
        for (let row = 0; row < this.rows; row++){
            for (let square = 0; square < this.rectsPerRow; square++){
                let x1 = square * (videoWidth / this.rectsPerRow);
                let x2 = x1 + (videoWidth / this.rectsPerRow);
                let y1 = row * (videoHeight / this.rows);
                let y2 = y1 + (videoHeight / this.rows);
                let newSquare = new Rect(x1, y1, x2, y2, canvasContext);
                this.untouchedRects.push(newSquare);
            }
        }

        this.chooseNewSquare();
        this.redrawSquares();
        // Now that the canvas is drawn, can change the background image to the div
        this.setState({firstDrawn:true});
        this.poseDetectionFrame(canvasContext);
    }

    redrawSquares(){
        // Just redraws the squares. No fancy shit.
        // draw untouched
        this.untouchedRects.forEach(rect => rect.drawSelf());
        // draw to be touched
        this.rectToTouch.drawSelf();
        // no need to re-draw the touched ones. They're supposed to be transparent anyways!
        
    }

    lerp(a, b, n) {
        return (1 - n) * a + n * b;
    }


    drawNose(x,y, context){
        // Draws a circle where the nose is.
        let newX = x;
        let newY = y;
        let noseX = this.lerp(this.noseLastXY.x, newX, 0.8);
        let noseY = this.lerp(this.noseLastXY.y, newY, 0.8);
        this.noseLastXY = {x: noseX, y:noseY};
        context.beginPath();
        context.fillStyle = "rgb(0,273, 238, 0.75)";
        context.arc(noseX, noseY, 10, 0, 2 * Math.PI);
        context.fill();
    }


    checkExceedTimer(){
        if (!this.state.won){
            // didn't get there in time
            const d = new Date();
            if (d.getTime() - this.startingTick > this.timeLimit){
                this.rectToTouch.revert();
                // exceeded, pick a new one
                this.chooseNewSquare();
                return true;
            }
            return false;
        }
    }


    touchSquare(x,y){
        // did the player touch their nose to the square in time?
        if (this.rectToTouch.isWithin(x,y)){
            const index = this.untouchedRects.indexOf(this.rectToTouch);
            if (index > -1) {
                this.rectToTouch.reveal();
                this.touchedRects.push(this.untouchedRects.splice(index, 1));
                if (this.untouchedRects.length <= 0){
                    this.setState({
                        won:true
                    })
                } else{
                    this.chooseNewSquare();
                }
                return true;
            }
        }
        return false;
    }


    chooseNewSquare(){
        // Chooses a new square from the untouched
        this.rectToTouch = this.untouchedRects[Math.floor(Math.random() * (this.untouchedRects.length))];
        this.rectToTouch.touchMeNow();
        // resets the game timer
        this.startingTick = new Date().getTime();        
    }


    poseDetectionFrame(canvasContext){
        const {
            algorithm,
            imageScaleFactor, 
            flipHorizontal, 
            outputStride, 
            minPoseConfidence, 
            minPartConfidence, 
            maxPoseDetections, 
            nmsRadius, 
            videoWidth, 
            videoHeight, 
            showVideo, 
            showPoints, 
            showSkeleton, 
            skeletonColor, 
            skeletonLineWidth 
            } = this.props

        const posenetModel = this.posenet;
        const video = this.video.current;

        const findPoseDetectionFrame = async () =>{
            let poses = [];

            switch(algorithm){
                case 'multi-pose': {
                    poses = await posenetModel.estimateMultiplePoses(
                        video,
                        {
                            imageScaleFactor:imageScaleFactor,
                            flipHorizontal: flipHorizontal,
                            outputStride:outputStride,
                            maxPoseDetections:maxPoseDetections,
                            minPartConfidence:minPartConfidence,
                            nmsRadius:nmsRadius
                          } 
                        )
                    break
                }
                case 'single-pose':{
                    const pose = await posenetModel.estimateSinglePose(
                        video, 
                        {
                            imageScaleFactor:imageScaleFactor,
                            flipHorizontal: flipHorizontal,
                            outputStride:outputStride
                          }
                        )
                    poses.push(pose);
                    break
                }
            }

            canvasContext.clearRect(0,0, videoWidth, videoHeight);

            if (showVideo){
                canvasContext.save();
                canvasContext.scale(-1,1);
                canvasContext.translate(-videoWidth, 0);
                canvasContext.drawImage(video, 0, 0, videoWidth, videoHeight);
                canvasContext.restore();
            }

            this.redrawSquares();

            if(!this.checkExceedTimer()){
                poses.forEach(({score, keypoints}) => {
                    if (score >= minPoseConfidence){
                        let x = keypoints[0].position.x;
                        let y = keypoints[0].position.y;
                        this.drawNose(x, y, canvasContext);
                        if (!this.state.won){
                            this.touchSquare(x, y);
                        }
                        
                        // keypoints[0].position.x
                        // keypoints[0].position.y
                        // if (showPoints){
                        //     drawKeyPoints(
                        //         keypoints,
                        //         minPartConfidence,
                        //         skeletonColor,
                        //         canvasContext
                        //     )
                        // }
                        // if (showSkeleton){
                        //     drawSkeleton(
                        //         keypoints,
                        //         minPartConfidence,
                        //         skeletonColor,
                        //         skeletonLineWidth,
                        //         canvasContext
                        //     )
                        // }
                    }
                })
            }

            
            requestAnimationFrame(findPoseDetectionFrame);
        }
        findPoseDetectionFrame();
    }

    render(){
        return(
            <div id={styles.background} className={this.state.firstDrawn ? styles.backgroundLoaded :null}>
                <canvas id="canvas" ref={this.canvas} width="600" height="400"></canvas>
                <video id="videoNoShow" ref={this.video} playsInline style={{display: "none"}}></video>
                { this.state.won ? <div className="quote">I am not a demon. I am a lizard, a shark, a heat-seeking panther. I want to be Bob Denver on acid playing the accordion.  -- Nicolas Cage</div> : null}
            </div>
        )
    }
}
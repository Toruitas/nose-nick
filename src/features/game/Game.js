import {drawKeyPoints, drawSkeleton} from './utils'
import React, {Component} from 'react';
// import { connect } from 'react-redux';
// import { selectThing } from './gameSlice';
import styles from "./Game.module.css";
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';
import { connect } from 'react-redux';
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
        showVideo: true,
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
            loading:true
        };
        this.canvas = React.createRef();
        this.video = React.createRef();
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
        this.detectPose()

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

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        this.poseDetectionFrame(canvasContext);
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

            poses.forEach(({score, keypoints}) => {
                if (score >= minPoseConfidence){
                    if (showPoints){
                        drawKeyPoints(
                            keypoints,
                            minPartConfidence,
                            skeletonColor,
                            canvasContext
                        )
                    }
                    if (showSkeleton){
                        drawSkeleton(
                            keypoints,
                            minPartConfidence,
                            skeletonColor,
                            skeletonLineWidth,
                            canvasContext
                        )
                    }
                }
            })
            requestAnimationFrame(findPoseDetectionFrame);
        }
        findPoseDetectionFrame();
    }

    render(){
        return(
            <div id={styles.background}>
                <canvas id="canvas" ref={this.canvas} width="600" height="400"></canvas>
                <video id="videoNoShow" ref={this.video} playsInline style={{display: "none"}}></video>
            </div>
        )
    }
}


// const mapStateToProps = state => {
//     return {
//         tool: selectSelectedTool(state),
//         vertices: selectVertices(state),
//         color1: selectColor1(state),
//         clear: selectClearCanvas(state)
//     }
// };

// export default connect(mapStateToProps, null)(Canvas);
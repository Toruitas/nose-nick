# Pose game
UAL: Creative Computing Institute

By me, Stuart Leitch!

Class taught by Phoenix Perry

This is an interactive game to try out using Tensorflow JS to load a pretrained model and use it in realtime interactions.

The game itself is kind of shit. Squares will light up and you're supposed to touch them. By touching them, they turn transparent and reveal the image underneath. What's the image? Just see!

Step 1: Create background image
Step 2: Turn camera on
Step 3: Feed frames to Posenet
Step 4: Get coordinates of hands
Step 5: Draw hands with some React-Three-Fiber shape on the canvas
Step 6: Draw 3D shapes using React-Three-Fiber in a grid
Step 7: If "touch" an object, it fades away

References:
https://medium.com/@kirstenlindsmith/translating-posenet-into-react-js-58f438c8605d  <== major props
https://medium.com/@miss.akaplan/integrating-ml5-js-posenet-model-with-three-js-b19710e2862b 
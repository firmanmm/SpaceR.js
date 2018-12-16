# SpaceR.js
SpaceR.js is a small web based javascript game that uses THREE.JS as its graphic driver. This source code is meant for tutorial only as its just a toy project that i did for my computer graphic class. This code structure takes inspiration from Unity Engine's game system which consist of three step execution. 

# Usage
There is a "Prepare" step where you can load all of your asset and show a progress bar in there. This project support multi scene system which you just need to push the scene in sceneManager and load it from there.

A gameobject may have three step to execute which is Awake, Start and Update.

- Awake - Executed once before start, use it to instantiate other object
- Start - Executed once but will not execute instantiated objects's awake
- Update - Executed continously on each frame

To get the delta time of each frame you can read it from computeManager.deltaTime. It gets updated on each frame.

Here is some screenshot for you :D

![Alt text](screenshot/Screenshot_1_Spacer_Rendoru.png?raw=true "SpaceR Screenshot 1")
![Alt text](screenshot/Screenshot_2_Spacer_Rendoru.png?raw=true "SpaceR Screenshot 2")
![Alt text](screenshot/Screenshot_3_Spacer_Rendoru.png?raw=true "SpaceR Screenshot 3")
![Alt text](screenshot/Screenshot_3_Spacer_Rendoru.png?raw=true "SpaceR Screenshot 4")

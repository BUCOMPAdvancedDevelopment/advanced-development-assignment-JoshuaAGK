# Advanced Development Games

Welcome to my "AD Games" repository! This is the code for my Advanced Development 2022/23 assignment.

## Setup and deployment

1. Clone the repo and run `npm i` to install the NPM packages.
2. Create a folder named `/config` inside `/src`.
3. For security reasons, private keys are not included in this repo. If you have them, add the following files to `/config`:
    1. *advanced-development-s5208752-firebase-adminsdk-r1azo-550af01131.json*
    2. *sql-credentials.json*
    3. *stripe-credentials.json*

### Windows
4. Run `npm run build` or `npm run build-win` in the Terminal.
5. The app should serve itself on `localhost:8080`. 

### Google App Engine
4. Run `npm run build-gae` in the Cloud Shell Terminal.
5. When the TypeScript Compiler logs *"Found 0 errors. Watching for file changes."*, end the TSC process with Control + C.
6. Run `gcloud app deploy` to deploy the app to Google Cloud.
7. Run `gcloud app browse` to see the URL the app has deployed to.

### Testing
Run `npm run test` to run unit tests against the API. Tests are located in `/src/__test__`.

## Author
> Joshua Kelley
>
> S5208752
>
> Bournemouth University
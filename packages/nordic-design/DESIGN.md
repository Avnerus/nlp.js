# Nordic design professor chat bot

This is a web application for students to learn about designing basic NLP-based chatbots. It is based on the NLP.js library.
The application allows anyone to create their own chatbot of a Nordic design professor. It will be hosted in a Vercel Serverless environment.

## User stories
### User story 1: Taking the tool in use

A student group sits next to a single computer and goes a URL.

Students see a website where they can start creating their own Nordic Design Chatbot Professor. At first they must 
 1) give a name to their professor, 2) upload an image of the professor and 3) choose a field of the professor . They may select from the following fields:

Industrial & Product Design
Furniture Design
Architecture
Visual Communication & Graphic Design
Service Design
UX / UI / Digital Product Design
Sustainable / Eco Design
Game Design
Textile / Fashion / Lifestyle Design
Packaging Design

In the same page they also see those Chatbot Professors that are already created on the site. See the user story 4.

### User story 2: “Coding” the chatbot 

After creating their professor they get to another page where they can modify the rules of the chatbot.
They can save their modification and continue to test the chatbot.

### User story 3: Previewing and testing the chatbot

In the coding page there is a link “test your chatbot”. This will give a page that looks like a classical chatbot, with the image of the “chat professor”, name etc.

In the  testing page there is a link to edit the chatbot.

### User story 4: Chatting with the chatbots

In the main page there are photos and names of the professors created with the tool. By clicking their name or photo the user will get to a page where they can chat with the professor.

## Tech bootstrap
The rules of the chatbot are taken from corpora JSON (can be in Vercel storage). The `corpora-en.json` file currently in this folder would be the starting template for every chatbot created. The `index.js` in this folder shows an example of how the NLP engine is started and processes user input. The corpora is now read using the config in `conf.json` but it should be changed to read the dynamic corpora defined for each chat bot by the students.

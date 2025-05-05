// MODIFIED BY CHATGPT CODE BLOEW
import cookies from 'cookie-parser';
import dotenv from "dotenv";
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url"; // Required for __dirname equivalent
import {
    canViewProfile,
    claimStory,
    deleteAccount,
    deleteStory,
    getLogin,
    getProfileData, getRecentRecords, getRegister, getSingleStory,
    getStoriesByTags,
    sendPost,
    showAndHideStories,
    submitStarRating,
    viewAuthorRanks,
    viewReaderRanks,
    viewStoryRanks
} from "./ScriptsAndServer/script.js";


dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url); // Get file path
const __dirname = path.dirname(__filename); // Get directory path
// MODIFIED BY CHATGPT CODE ABOVE
app.use(express.urlencoded({ extended: true })); // Make sure this line is present
var token = null;



app.use(express.static(path.join(__dirname)));
app.use(cookies())



// Home Page
app.get('/', async (req, res) => {
    try {
        fs.readFile( path.join(__dirname, 'Pages', 'LandingPage.html'), 'utf8', async (err, htmlContent) => {
            let profileContent = await getRecentRecords(req.cookies, htmlContent)
            res.send(profileContent);
        })
    } catch (error) {
        console.error('Error:', error);
    }
});

// Profile Page
app.get('/profile', async (req, res) => {
    if(!canViewProfile(req.cookies)){
        return res.sendFile(path.join(__dirname, "Pages/LoginRegisterPage.html"));
    }
    else{
        fs.readFile( path.join(__dirname, 'Pages', 'PersonalPage.html'), 'utf8', async (err, htmlContent) => {
            let profileContent = await getProfileData(req.cookies, htmlContent)
            res.send(profileContent);
        })
    }
});

// Story making Page
app.get('/post-creation', (req, res) => {
    res.sendFile(path.join(__dirname, "Pages/PostCreationPage.html"))
});

// Story ranking Page
app.get('/story-ranking', (req, res) => {
    fs.readFile( path.join(__dirname, 'Pages', 'StoryRankingPage.html'), 'utf8', async (err, htmlContent) => {
        let profileContent = await viewStoryRanks(req.cookies, htmlContent)
        res.send(profileContent);})
});

// Author ranking Page
app.get('/author-ranking', (req, res) => {
    fs.readFile( path.join(__dirname, 'Pages', 'AuthorRankingPage.html'), 'utf8', async (err, htmlContent) => {
        let authorContent = await viewAuthorRanks(req.cookies, htmlContent)
        res.send(authorContent);
    })
});

// Readers ranking Page
app.get('/reader-ranking', (req, res) => {
    fs.readFile( path.join(__dirname, 'Pages', 'ActiveReaderPage.html'), 'utf8', async (err, htmlContent) => {
        let profileContent = await viewReaderRanks(htmlContent)
        res.send(profileContent);})
})

// Tags Page
app.get('/tags', (req, res) => {
    res.sendFile(path.join(__dirname, "Pages/TagsPage.html"))
})



// Login and Register GET and POST
app.post('/login', async (req, res) => {
    let response = await getLogin(req.body)
    token = response.token;
    let cookieData = response.cookieData

    if(cookieData !== undefined){
        res.cookie('user', cookieData, { maxAge: 14400000 }) //4 hours
    }
    res.send(response.location);
});

app.post('/register', async (req, res) => {
    let response = await getRegister(req.body)
    token = response.token;
    res.send(response.location);
});



app.get('/log-out', (req, res) => {
    res.clearCookie("user");
    res.redirect("/");
})

app.get('/authorization', (req, res) => {
    res.clearCookie("user");
    res.sendFile(path.join(__dirname, "Pages/LoginRegisterPage.html"))
});


app.get('/delete-account', async (req, res) => {
    let account = await deleteAccount(req.cookies);
    res.clearCookie("user");
    res.send(account);
});


// Story GET and POST
app.get('/story/:id', async (req, res) => {
    const storyId = req.params.id; // Get the story ID from the URL
    try {
        fs.readFile( path.join(__dirname, 'Pages', 'SingleStory.html'), 'utf8', async (err, htmlContent) => {
            let pageContent = await getSingleStory(storyId, htmlContent, req.cookies)
            res.send(pageContent);
        })
    } catch (error) {
        console.error('Error:', error);
        res.sendFile(path.join(__dirname, "Pages/SingleStory.html"))
        //res.status(500).send('Internal Server Error');
    }
});

app.get('/claim-story/:id', async (req, res) => {
    let location = await claimStory(req.params.id, req.cookies);
    res.send(location);
})

app.post('/deleteStory', async (req, res) => {
    const match = await req.headers.referer.match(/\/story\/(\d+)/);
    let output = await deleteStory(match[1])
    res.send(output);
})



app.post('/post', async (req, res) =>{
    try{
        let result = await sendPost(req.body, req.cookies)
        if(result === undefined){res.redirect("/")}
        res.send(result)
    }catch(error){
        console.log("error in /post ", error)
    }
})
app.post('/searchStories', (req, res) => {
    fs.readFile( path.join(__dirname, 'Pages', 'TagsSearchPage.html'), 'utf8', async (err, htmlContent) => {
        let pageContent = await getStoriesByTags(req.body, req.cookies, htmlContent)
        res.send(pageContent);
    })
})


app.get('/showAndHideStories/:id', async (req, res) => {
    let result = await showAndHideStories(req.params.id, req.cookies);
    res.send(result)
});





// Open Single Story
app.get("/author/:id", async (req, res) => {
    const storyId = req.params.id; // Get the story ID from the URL
    try {
        fs.readFile( path.join(__dirname, 'Pages', 'SingleStory.html'), 'utf8', async (err, htmlContent) => {
            let pageContent = await getSingleStory(storyId, htmlContent, req.cookies)
            res.send(pageContent);
        })
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

// Give Star Rating
app.post('/starRate', async (req, res) => {
    res.send(await submitStarRating(req.headers.referer, req.body, req.cookies));
});


app.use((req, res) => {
    res.sendFile(path.join(__dirname, "Pages/ErrorPage.html"))
});

app.listen(8080)
console.log("Your website is ready: http://localhost:8080");

//console.log(randomBytes(64).toString('hex')); // THIS LINE WAS USED TO CREATE SECRETS!

/**
 * Packages Installed:
 * "type": "module",
 * express
 * node.js
 * @supabase/supabase-js
 * jsonwebtoken
 * dotenv
 * bcrypt
 * access
 * cookie-parser
 * aes-js
 * crypto
 * */

// CONSIDER ADDING A CAPCHA AT THE END FOR THE CREATE POST PART!
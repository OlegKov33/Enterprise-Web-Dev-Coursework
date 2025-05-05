import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const secretKey = process.env.SECRET_KEY

// Internal function are run in script only.
// External functions are run on server and script.

// INTERNAL FUNCTIONS START
function usernameFromCookie(cookie){
    if(cookie.user === undefined || cookie.user.length !== 64){
        return "no";
    }
    try{
    let text = cookie.user;
    const iv = Buffer.from(text.slice(0, 32), 'hex'); // Extract IV
    const encryptedText = text.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    decrypted = decrypted.slice(0, -4)
    return decrypted;
    }
    catch(error){
        console.log("Error at usernameFromCookie, ",error)
        return undefined;
    }
}

function generateAccessToken(username) {
    return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '7200s' });
}

function generateCookie(username){
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv); //32 characters?
    let encrypted = cipher.update(username+"true", 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted; // Store IV with the data
}

function isValidTag(tag){
    let tagsToVerify = tag.length;
    if(tagsToVerify >5){return false;}
    const TagValues = [
        "Fantasy & Mythology", "Science Fiction & Futurism",
        "Horror & Thriller", "Mystery & Crime",
        "Romance & Relationships", "Drama & Slice of Life",
        "Humor & Satire", "Historical & Alternate History",
        "Experimental & Abstract"]
    for(let i = 0; i < tag.length; i++){
        for(let j = 0; j< TagValues.length; j++){
            if(tag[i]===TagValues[j]){
                tagsToVerify--;
            }
        }
    }
    if(tagsToVerify !== 0){return false;}
    return true;
}

async function viewYourPosts(cookie){
    let username = usernameFromCookie(cookie);
    const { data, error } = await supabase.from('posts').select('id, title').eq('auth', username);
    let result = "";
    if(data.length === 0){
        if((await supabase.from("posts_hidden").select("auth").eq("auth",username)).data.length > 0){
            result += `<button onclick="window.location.href='/showAndHideStories/'+this.value" value="show">Show everything</button>`
            result += `<button onclick="window.location.href='/showAndHideStories/'+this.value" value="hide">Hide everything</button><br>`
            return result;
        }else{
            return "no posts yet."
        }
    }
    if (error) {
        console.error('Error inserting data:', error);
    }
    
    result += `<button onclick="window.location.href='/showAndHideStories/'+this.value" value="show">Show everything</button>`
    result += `<button onclick="window.location.href='/showAndHideStories/'+this.value" value="hide">Hide everything</button><br>`
    for(let i = 0; i< data.length; i++){
        result+=`<a href="/story/${data[i].id}">${data[i].title}</a><br>`
    }
    return result;
}


// CODE MADE WITH DEEPSEEK and CHATGPT
function isSQLInjection(input) {
    // If input is not a string, convert it to a string
    if (typeof input !== "string") {
        input = String(input);
    }

    // Common SQL keywords and dangerous patterns
    const sqlKeywords = [
        "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "UNION",
        "ALTER", "CREATE", "EXEC", "TRUNCATE", "MERGE", "OR '1'='1'",
        "--", ";", "/*", "*/", "'", '"', "xp_cmdshell", "SHUTDOWN",
        "DECLARE", "CAST", "CONVERT"
    ];

    // Special characters often used in SQL injection attacks
    const dangerousChars = ["\\", "\n", "\r", "\t", "\b", "\f", "%00", "%", "_"];

    // Convert input to uppercase for case-insensitive comparison
    const upperInput = input.toUpperCase();

    // Check for SQL keywords
    for (const keyword of sqlKeywords) {
        if (upperInput.includes(keyword)) {
            return true; // Detected SQL keyword
        }
    }

    // Check for dangerous special characters
    for (const char of dangerousChars) {
        if (input.includes(char)) {
            return true; // Detected dangerous character
        }
    }

    return false; // No SQL injection detected
}
// CODE MADE WITH DEEPSEEK and CHATGPT
// INTERNAL FUNCTIONS FINISH


// EXTERNAL FUNCTIONS START
// Does not use supabase.
export function canViewProfile(cookie){
    if(cookie.user === undefined || cookie.user.length !== 64){
        return false;
    }
    let text = cookie.user
    try{
    const iv = Buffer.from(text.slice(0, 32), 'hex'); // Extract IV
    const encryptedText = text.slice(32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    if(decrypted.slice(-4) === "true"){
        return true;
    }
    return false;
    }catch(error){
        console.log("Error at canViewProfile, ",error)
        return false;
    }
}

//The rest use supabase (async)
export async function getStoriesByTags(body, cookie, htmlContent){

    let data, error, userSeenStories, ratedStories, output = "";
    try{
        if(cookie.user === undefined){
            const result = await supabase
                .from('posts') // Replace with your table name
                .select('id, title, author_status')
                .contains('tags', [body.Tags])
                .order('rankers_number', { ascending: false }) // Order by most recent
                .order('ranking', { ascending: false })
                .limit(10)
                data = result.data; error = result.error;
    
                output = "<ul>";
                for(let i = 0; i<data.length; i++){
                    output+=`<li><a href="/story/${data[i].id}">${data[i].title}</a> made by: ${data[i].author_status}</li>`
                }
                if(data.length===0){output+="Sorry, something went wrong."}
                output += "</ul>"
                const returnContent = htmlContent.replace('<section id="TagStories">', `<section id="TagStories">${output}`);
                return returnContent;
        }else{
            userSeenStories = await supabase.from("users").select("rated_stories").eq("username",usernameFromCookie(cookie))
            ratedStories = userSeenStories.data[0].rated_stories;
        }


        if(body.Seen === "Seen" && body.Public === "False"){ //Hides the stores you read and public
            
            const result = await supabase
            .from('posts') // Replace with your table name
            .select('id, title, author_status')
            .not("id","in", `(${ratedStories.join(",")})`)
            .eq("publicity", body.Public)
            .contains('tags', [body.Tags])
            .order('rankers_number', { ascending: false }) // Order by most recent
            .order('ranking', { ascending: false })
            .limit(10)
            data = result.data; error = result.error;
        }
        else if(body.Seen === "Seen"){
            const result = await supabase
            .from('posts') // Replace with your table name
            .select('id, title, author_status')
            .not("id","in", `(${ratedStories.join(",")})`)
            .contains('tags', [body.Tags])
            .order('rankers_number', { ascending: false }) // Order by most recent
            .order('ranking', { ascending: false })
            .limit(10)
            data = result.data; error = result.error;
        }
        else if(body.Public === "False"){
            const result = await supabase
            .from('posts') // Replace with your table name
            .select('id, title, author_status')
            .eq("publicity", body.Public)
            .contains('tags', [body.Tags])
            .order('rankers_number', { ascending: false }) // Order by most recent
            .order('ranking', { ascending: false })
            .limit(10)
            data = result.data; error = result.error;
        }
        else{
            const result = await supabase
            .from('posts') // Replace with your table name
            .select('id, title, author_status')
            .contains('tags', [body.Tags])
            .order('rankers_number', { ascending: false }) // Order by most recent
            .order('ranking', { ascending: false })
            .limit(10)
            data = result.data; error = result.error;
        }
    
    

    
    

    if(data ===  undefined || data.length === 0){
        output+="<ul>Sorry, something went wrong.</ul>"
        const returnContent = htmlContent.replace('<section id="TagStories">', `<section id="TagStories">${output}`);
        return returnContent;
    }

    output = "<ul>";
    for(let i = 0; i<data.length; i++){
        output+=`<li><a href="/story/${data[i].id}">${data[i].title}</a> made by: ${data[i].author_status}</li>`
    }
    output += "</ul>"


    const returnContent = htmlContent.replace('<section id="TagStories">', `<section id="TagStories">${output}`);
        
    return returnContent;
    }catch(error){
        output+="<ul>Sorry, something went wrong.</ul>"
        const returnContent = htmlContent.replace('<section id="TagStories">', `<section id="TagStories">${output}`);
        return returnContent;
    }
    //<section id="TagStories">

    
    //replace a specific pages <section> and wyala you got "could done :D"
    // IF NO STORES ARE RETURNED TELL - SORRY SOMETHING WENT WRONG
    // IF AT LEAST 1 STORY RETUREND TELL - HERE IS YOUR STORY
}

export async function getLogin(body){
    const {LoginPassword, LoginUsername} = body;

    // Ensure that input is decent in length
    if (LoginPassword.length < 4 || LoginPassword.length > 16 ||
        LoginUsername.length < 4 || LoginUsername.length > 16) {
        return{ token: null, cookie: null,
                location: `<script>
                    alert("Sorry, your username or password does not meet length requirement (4-16).");
                    window.location.href = "/authorization";
                    </script>`}
    }
    // Ensure the input is safe for back-end
    if (isSQLInjection(LoginUsername) || isSQLInjection(LoginPassword)){
        return{ token:null, cookie: null,
                location:`<script>
                    alert("Sorry, your username or password is unsafe.");
                    window.location.href = "/authorization";
                    </script>`}
    }
    // Try to get user from database and validate their password
    try{
        // Retrieve user from Supabase
        const { data, error } = await supabase
        .from('users').select('username, password')  // Explicitly select only necessary fields
        .eq('username', LoginUsername).single();


        if(error){
            return{ token: null, cookie: null,
                    location: `<script>
                alert("Sorry, something went wrong.");
                window.location.href = "/authorization";
                </script>`}
        }
        const isPasswordValid = await bcrypt.compare(LoginPassword, data.password);
        if(!isPasswordValid){
            return{ token: null, cookie: null,
                    location: `<script>
                alert("Sorry, something went wrong.");
                window.location.href = "/authorization";
                </script>`}
        }

        return{ token: generateAccessToken({username: LoginUsername}),
                cookieData: generateCookie(LoginUsername),
                location:`<script>
                alert("Login successful.");
                window.location.href = "/";
                </script>`}
    }catch(err){
        return{ token: null, cookie: null,
                location: `<script>
        alert("Sorry, something went wrong.");
        window.location.href = "/authorization";
        </script>`}
    }
}

export async function getRegister(body){
    const { UsernameForRegister, ReaderWriter,
            PasswordForRegister} = body;
    //If the input is very poor, tell user to re-enter.
    if (UsernameForRegister.length < 4 || UsernameForRegister.length > 16 ||
        PasswordForRegister[0].length < 4 || PasswordForRegister[0].length > 16 ||
        (ReaderWriter !== "Read" || ReaderWriter !== "Write" || ReaderWriter !== "Both") &&
        PasswordForRegister[0] !== PasswordForRegister[1]) {
            return{ token: null,
                    location: `<script>
                    alert("Sorry, your username or password does not meet requirement.");
                    window.location.href = "/authorization";
                    </script>`}
        }
        if (isSQLInjection(UsernameForRegister) || isSQLInjection(PasswordForRegister[0])){
            return{ token: null,
                    location: `<script>
                    alert("Sorry, your username or password is unsafe.");
                    window.location.href = "/authorization";
                    </script>`}
        }


    try{
        const hashedPassword = await bcrypt.hash(PasswordForRegister[0], 10);
        let data, error; // Declare variables outside the blocks

        // DEPENDING ON THE Reader/Writer setting, the insertion will be different.
        if (ReaderWriter === "Both") {
                // Insert user into Supabase IF BOTH THINGS ARE TRUE
                ({ data, error } = await supabase
                    .from('users').insert([{
                        username: UsernameForRegister, password: hashedPassword,
                        reader: true, writer: true, rated_stories: [0]
                }]).select());

            } else if (ReaderWriter === "Read") {
                // Insert user into Supabase IF ONLY READ IS TRUE
                ({ data, error } = await supabase
                    .from('users').insert([{
                        username: UsernameForRegister, password: hashedPassword,
                        reader: true, writer: false, rated_stories: [0]
                }]).select());
            } else {
                // Insert user into Supabase IF ONLY WRITE IS TRUE
                ({ data, error } = await supabase
                    .from('users').insert([{
                        username: UsernameForRegister, password: hashedPassword,
                        reader: false, writer: true, rated_stories: [0]
                    }]).select());
            }
            return{ token: generateAccessToken({username: UsernameForRegister}),
                    location:`<script>
                    alert("Register successful.");
                    window.location.href = "/";
                    </script>`}
    }catch(err){
        return{ token: null,
                location: `<script>
                alert("Sorry, Something went wrong.");
                window.location.href = "/authorization";
                </script>`}
    }
}

export async function sendPost(body, cookie){
    let { StoryTitleInput, Visibility,
        Status, ContentInput, Tags} = body;
    if(!Array.isArray(Tags)){
            Tags = [Tags]
        }

    if(cookie.user === undefined || cookie.user.length !== 64 || usernameFromCookie(cookie) === undefined){
        if( StoryTitleInput === undefined ||StoryTitleInput.length === 0 ||
            String(StoryTitleInput).includes("<") ||String(StoryTitleInput).includes(">") ||
            String(ContentInput).includes("<") ||String(ContentInput).includes(">") ||
            ContentInput === undefined || ContentInput.length === 0 ||
            Tags === undefined || !isValidTag(Tags) ||
            !(Visibility === "Public") ||
            !(Status === "Guest")){
                return (`<script>
                alert("We couldn't create your story, please try again.");
                window.location.href = "/post-creation";
                </script>`)
            }
            try{
                let storyCode  = await crypto.randomUUID();
                let {data,error} = await supabase
                .from('posts') // Replace with your actual table name
                .insert([
                    {
                        title: StoryTitleInput,
                        auth: "guest",
                        story: ContentInput,
                        author_status: "guest",
                        tags: Tags,
                        publicity: Visibility === "Public", // If the visibility is public make it true... if private, false
                        code: storyCode,
                    }
                ]);
                return (`<script>
                    async function copyCode() {
                        alert("Your story has been created, if you wish to keep it, use this code on your profile page: ${storyCode}");
                        
                        try {
                            // Request clipboard permissions explicitly
                            const permission = await navigator.permissions.query({ name: "clipboard-write" });
                
                            if (permission.state === "granted" || permission.state === "prompt") {
                                await navigator.clipboard.writeText("${storyCode}");
                                alert("Code copied to clipboard!");
                                window.location.href = "/";
                            } else {
                                throw new Error("Clipboard permission denied");
                                window.location.href = "/";
                            }
                        } catch (err) {
                            console.error("Clipboard write failed:", err);
                            alert("Failed to copy the code. Please copy it manually: \t ${storyCode}");
                            window.location.href = "/";
                        }
                        window.location.href = "/";
                    }
                
                    copyCode();
                </script>`);

            }catch (error){
                return `<script>
                    async function copyCode() { alert("how?");window.location.href = "/";}
                    copyCode();`
            }
    }

    try{
    let username = usernameFromCookie(cookie);

    if( StoryTitleInput === undefined || StoryTitleInput.length === 0 ||
        ContentInput === undefined || ContentInput.length === 0 ||
        !isValidTag(Tags) ||
        String(StoryTitleInput).includes("<") ||String(StoryTitleInput).includes(">") ||
        String(ContentInput).includes("<") ||String(ContentInput).includes(">") ||
        !(Visibility === "Public" || Visibility === "Private") ||
        !(Status === "Author" || Status === "Anonymous")){
            return (`<script>
            alert("We couldn't create your story, please try again.");
            window.location.href = "/post-creation";
            </script>`)
        }

    if (Status === "Author"){Status = username}
    const error = await supabase
    .from('posts') // Replace with your actual table name
    .insert([
        {
            title: StoryTitleInput,
            auth: username,
            story: ContentInput,
            author_status: Status,
            tags: Tags,
            publicity: Visibility === "Public",
            duration: 90
        }
    ]);
    return (`<script>
        alert("Your story has been created");
        window.location.href = "/";
        </script>`)
    }catch(error){
        return (`<script>
            alert("We couldn't create your story, please try again.1");
            window.location.href = "/post-creation";
            </script>`)
    }
}
export async function getProfileData(cookie, htmlContent) {
    try {
        let listItemsHtml = `<h3>${usernameFromCookie(cookie)}</h3>`;
        const posts = await viewYourPosts(cookie); // Wait for posts to resolve
        listItemsHtml += posts; // Add the resolved value
        // Replace the placeholder in the HTML content
        const returnContent = htmlContent.replace('<section id="Personal Page">', `<ul id="item-list">${listItemsHtml}</ul>`);
        
        return returnContent;
    } catch (error) {
        console.error("Error in getProfileData:", error);
        throw error; // Propagate the error to the caller
    }
}

export async function viewStoryRanks(cookie, htmlContent) {
    //if the user is logged in, they can see "hidden stories"
    // if the user is on public, they can see all top 5 best posts
    let data, error;
    if(!canViewProfile(cookie)){
    const result = await supabase
        .from('posts') // Replace with your table name
        .select('id, title, ranking, rankers_number') // Select the fields you need
        .order('rankers_number', { ascending: false }) // Order by most recent
        .order('ranking', { ascending: false })
        .eq("publicity", "TRUE")
        .not('ranking', 'is', null)
        .limit(5); // Limit to 5 records
        data = result.data; error = result.error;
    }
    else{
        const result = await supabase
        .from('posts') // Replace with your table name
        .select('id, title, ranking, rankers_number') // Select the fields you need
        .order('rankers_number', { ascending: false })
        .order('ranking', { ascending: false }) // Order by most recent
        .not('ranking', 'is', null)
        .limit(5); // Limit to 5 records
        data = result.data; error = result.error;
    }
    if (error) {
        console.error('Error fetching records:', error);
        return [];
    }

    try{
    let result = ""; //if you don't add "" you will get "undefined" -_-
    // <UL> <LI><A href>Title - (Rated by:... || Average Rating: ...) </A></LI> ... </UL>
    result+="<ol>";
    for(let i = 0; i < data.length; i++){
        result += `<li><a href="/story/${data[i].id}">`
        result += `${data[i].title} - (Rated by: ${data[i].rankers_number}`
        result += ` || Average Rating: ${parseFloat(data[i].ranking/data[i].rankers_number).toFixed(1)})</a></li>`
    }
    if(data.length === 0){result += "Sorry, something went wrong."}
    result+="</ol>";
    const returnContent = htmlContent.replace('<section id="StoryRanking">', `<section id="StoryRanking">${result}`);
    return returnContent;
    }catch (error){
        console.log("Error occurued in viewStoryRanks: ",error)
    }
}

export async function getRecentRecords(cookie, htmlContent) {
    // IF A USER IS NOT LOGGED IN, OR HAS CORRECT COOKIE, SHOW THEM ONLY PUBLIC STORIES!
    let data, error;
    if(!canViewProfile(cookie)){
        const result = await supabase
        .from('posts') // Replace with your table name
        .select('id, title') // Select the fields you need
        .order('id', { ascending: false }) // Order by most recent
        .eq("publicity", "TRUE")
        .limit(10); // Limit to 5 records
        data = result.data; error = result.error;
    }
    else{
        // GET STORIES
        const result = await supabase
        .from('posts') // Replace with your table name
        .select('id, title') // Select the fields you need
        .order('id', { ascending: false }) // Order by most recent
        .limit(10); // Limit to 5 records
        data = result.data; error = result.error;
    }


    if (error) {
        console.error('Error fetching records:', error);
        return [];
    }

    
    try{
        let result = "";
        for(let i = 0; i < data.length; i++){
            result+=`<a href="/story/${data[i].id}">${data[i].title}</a><br></br>`
        }
        if(data.length === 0){result+="Sorry, something went wrong."}
        const returnContent = htmlContent.replace('<ul id="item-list">', `<ul id="item-list">${result}`);
        return returnContent; // Returns an array of records
    }catch(err){
        console.log("Error in getRecentRecords ", err)
    }
    
}

export async function getSingleStory(storyId, htmlContent, cookie){
    try {
        // Fetch the specific record from Supabase
        const { data, error } = await supabase
            .from('posts') // Replace with your table name
            .select('*')
            .eq('id', storyId) // Filter by the story ID
            .single(); // Get a single record

        if (error || !data) {
            console.error('Error fetching story:', error);
            return res.status(404).send('Story not found');
        }
        let result="";
        result+=`<h1>${data.title}</h1>`                    // Title
        result+=`<h4> Made by - ${data.author_status}</h4>` // Author
        result+=`<p>${data.story}<p>`                       // Story
        result+=`<br><p>Tags: `                             // Tags
        
        for(let i = 0; i<data.tags.length; i++){
            result+=`${data.tags[i]}, `
        }
        result+="</p>"
        let returnContent = htmlContent.replace('<section>', `<section>${result}`);

        // IF guest
        if(cookie.user === undefined || cookie.user.length !== 64 || usernameFromCookie(cookie)=== undefined){
            return returnContent;
        }


        if( cookie.user !== undefined || (!cookie.user.length === undefined)){
            const [loggedIn, author] = [canViewProfile(cookie), usernameFromCookie(cookie)];
            // IF author
            if(loggedIn && author === data.auth){
                returnContent = authorSingleStory(returnContent);
                return returnContent;
            }
            // IF user
            if(loggedIn && author !== data.auth){
                let userSeenStories = await supabase.from("users").select("rated_stories").eq("username",author)
                const ratedStories = userSeenStories.data[0].rated_stories;
                if(ratedStories.includes(data.id) === true){
                    return returnContent;
                }

                let starResult = ``
                starResult += `<div id="star">
                <label>Please rank this story from 1-5 below:</label>(1)
                <input type="radio" name="starRating" value=1><input type="radio" name="starRating" value=2>
                <input type="radio" name="starRating" value=3><input type="radio" name="starRating" value=4>
                <input checked type="radio" name="starRating" value=5>(5)
                <br><button type="submit">Submit</button></div>`
                returnContent = returnContent.replace('</section>', `</section>${starResult}`)
                return returnContent;
            }
        }

    }catch(error){
        console.log("Error in getSingleStory ", error)
    }
}
export async function authorSingleStory(args){
    try{
        args = await args.replace(`"/starRate"`, `"/deleteStory"`)
        args = await args.replace("</section>",`</section><button type="submit">Delete Story</button>`)
    
        return args
    }catch(error){
        console.log("error in authorSingleStory ",error)
    }
}

export async function deleteAccount(cookie){
    try{
    let username = usernameFromCookie(cookie)
    if(username === undefined || cookie.user === undefined || cookie.user.length !== 64){
        return (`<script>
            alert("Something went wrong.");
            window.location.href = "/";
            </script>`)
    }
    await supabase
    .from('posts')
    .delete()
    .eq('auth', username)

    await supabase
    .from('posts_hidden')
    .delete()
    .eq('auth', username)
    
    await supabase
    .from('users')
    .delete()
    .eq('username', username)
    
    return (`<script>
            alert("You have deleted your account.");
            window.location.href = "/";
            </script>`)
    }catch(error){
        return (`<script>
            alert("Something went wrong.");
            window.location.href = "/";
            </script>`)
    }
}

export async function submitStarRating(referer, body, cookie) {
    try{
        if(body.starRating === undefined || (![1, 2, 3, 4, 5].includes(parseInt(body.starRating))) || cookie.user === undefined || cookie.user.length !== 64 || usernameFromCookie(cookie)=== undefined){
            return(`<script>
                alert("Sorry, something went wrong.");
                window.location.href = "/";
                </script>`)
        }
        let stories_ranked = await supabase.from("users").select("rated_stories").eq("username",usernameFromCookie(cookie))
        let story = parseInt(referer.split('/')[4])

        stories_ranked.data[0].rated_stories.push(story)
        await supabase
        .from("users")
        .update({"rated_stories": stories_ranked.data[0].rated_stories})
        .eq("username", usernameFromCookie(cookie))

        const { data, error } = await supabase
        .from('posts')
        .select("ranking, rankers_number")
        .eq('id', referer.split('/')[4])

        await supabase
        .from("posts")
        .update({"ranking": data[0].ranking + parseInt(body.starRating),
                "rankers_number": data[0].rankers_number + 1})
        .eq("id", referer.split('/')[4])

        return(`<script>
                    alert("Your rating was submitted.");
                    window.location.href = "/";
                    </script>`)
    }catch(error){
        console.log("Error occured in submitStarRating: ",error)
        return(`<script>
                    alert("Sorry, something went wrong.");
                    window.location.href = "/";
                    </script>`)
    }
}

export async function viewReaderRanks(htmlContent) {
    let data, error;
    
    try{
        const {data, error} = await supabase
            .from('users')
            .select('username, rated_stories')
            .filter('rated_stories', 'neq', '{0}')
            .order('rated_stories', { ascending: false })
            .limit(5)
            
            if(data.length === 0 || data === undefined){
                htmlContent = htmlContent.replace('<section id="ActiveReader">', `<section id="ActiveReader"><ol>Sorry, something went wrong.</ol>`)
                return htmlContent;
            }
            let result = "<ol>";
            for(let i = 0; i<data.length;i++){
                if(data[i].rated_stories.length > 1){
                    result += `<li>${data[i].username} has read ${data[i].rated_stories.length-1} stories</li>`
                }
            }
            
            result += "</ol>"
            let returnContent = htmlContent.replace('<section id="ActiveReader">', `<section id="ActiveReader">${result}`)
            return returnContent;
    }catch (error){
        console.log("Error in ViewReaderRanks, ", error);
    }
}

export async function claimStory(id, cookies) {
    try{
        let username = usernameFromCookie(cookies)
        const {data, error } = await supabase
            .from('posts')
            .select("auth, code")
            .eq("auth","guest")
            .eq("code",id)

        if(data.length === 0 || data === undefined){
            return(`<script>
                alert("Something went wrong.");
                window.location.href = "/profile";
                </script>`)
        }

        if(data[0].auth === "guest" && data[0].code === id){
            let error = await supabase
            .from('posts')
            .update({"auth": username, "author_status": username})
            .eq("auth","guest")
            .eq("code",id)
            .single()
            return(`<script>
                        alert("You have claimed your story!");
                        window.location.href = "/profile";
                        </script>`)
        }
        return(`<script>
            alert("Something went wrong.");
            window.location.href = "/profile";
            </script>`)
    }catch (error){
        console.log("Error in claimStory ", error)
        return(`<script>
            alert("Something went wrong.");
            window.location.href = "/profile";
            </script>`)
    }
}

export async function viewAuthorRanks(cookie, htmlContent) {
    let data, error;
    if(!canViewProfile(cookie)){
        const result = await supabase
            .from('posts')
            .select('id, title, auth, ranking, rankers_number')
            .eq("publicity", "TRUE")
            .neq("author_status", "Anonymous")
            .neq("auth", "guest")
            .order('rankers_number', { ascending: false })
            .order('ranking', { ascending: false })
            .not('ranking', 'is', null)
            data = result.data; error = result.error;
        }
        else{
            const result = await supabase
            .from('posts')
            .select('id, title, auth, ranking, rankers_number')
            .neq("author_status", "Anonymous")
            .neq("auth", "guest")
            .order('rankers_number', { ascending: false })
            .order('ranking', { ascending: false })
            .not('ranking', 'is', null)
            data = result.data; error = result.error;
        }
        if (error) {
            console.error('Error fetching records:', error);
            return [];
        }
        try{
        let result = "";
        let topFiveUsers = [];
        for(let i = 0; i < data.length; i++){
            if(topFiveUsers.length===6){
                break;
            }else{
                if(!topFiveUsers.includes(data[i].auth)){
                    topFiveUsers[topFiveUsers.length] = data[i].auth
                }
            }
        }

        var topFiveUserStores = []
        var topFiveUserStoryIDs = []
        for(let i = 0; i<data.length; i++){
            if(data[i].auth === topFiveUsers[topFiveUserStores.length]){
                if(topFiveUserStores.length === 5){break;}
                topFiveUserStores[topFiveUserStores.length] = data[i].title;
                topFiveUserStoryIDs[topFiveUserStoryIDs.length] = data[i].id;
            }
        }

        var usersStars = [0, 0, 0, 0, 0]
        var usersRanked = [0, 0, 0, 0, 0]
        for(let i = 0; i <topFiveUsers.length;i++){
            for(let j = 0; j <data.length; j++){
                if(data[j].auth === topFiveUsers[i]){
                    let tempStar = parseInt(data[j].ranking);
                    let tempRank = parseInt(data[j].rankers_number);
                    usersStars[i]= usersStars[i] + tempStar;
                    usersRanked[i]+= tempRank;
                }
            }
        }

        result+="<ol>";
        for(let i = 0; i < topFiveUsers.length; i++){
            result += `<li><p>${topFiveUsers[i]} (Rated by: ${usersRanked[i]})||(Average rating: ${parseFloat(usersStars[i]/usersRanked[i]).toFixed(1)})
            (Most popular story: <a href="/story/${topFiveUserStoryIDs[i]}">${topFiveUserStores[i]})</a></p></li>`
        }
        if(data.length === 0){result+="Sorry, something went wrong."}
        result+="</ol>";
        const returnContent = htmlContent.replace('<section id="AuthorRanking">', `<section id="AuthorRanking">${result}`);
        return returnContent;
        }catch (error){
            console.log("Error occurued in viewStoryRanks: ",error)
        }
}

export async function showAndHideStories(id, cookie) {
    if(!(id === "show" || id === "hide")){
        return `<script>
                    alert("Sorry, something went wrong.");
                    window.location.href = "/profile";
                </script>`;
    }
    let username = usernameFromCookie(cookie)
    if(id === "hide"){
        const { data: sourceData, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .match({auth:username})

        const { data: insertData, error: insertError } = await supabase
        .from('posts_hidden')
        .upsert(sourceData);

        const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .match({auth:username});

        return `<script>
                    alert("Your posts have been hidden back.");
                    window.location.href = "/profile";
        </script>`
    }
    else{
        const { data: sourceData, error: fetchError } = await supabase
        .from('posts_hidden')
        .select('*')
        .match({auth:username})

        const { data: insertData, error: insertError } = await supabase
        .from('posts')
        .upsert(sourceData);

        const { error: deleteError } = await supabase
        .from('posts_hidden')
        .delete()
        .match({auth:username});

        return `<script>
            alert("Your posts have been brought back .");
            window.location.href = "/profile";
        </script>`
    }
}

export async function deleteStory(ids){
    try{
    await supabase
    .from("posts")
    .delete()
    .match({id:ids})

    return `<script>
    alert("Your story has been removed.");
    window.location.href = "/profile";
    </script>`
}catch(error){
    console.log("Error in deletStory,", error);
}
}

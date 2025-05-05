## Setup
In this README file, you will get an overview of how to run this project correctly.
Pre-requisite
[Supabase Account](https://supabase.com/), Computer, access to Windows Command Prompt and [Node.js](https://nodejs.org/). (Optional: Visual Studio Code or any IDE of your choice)

### Supabase setup
1. Create __New Organisation__
2. Create __New Project__
3. Navigate __SQL Editor__ on side panel
4. Use the code in [setup_supabase.txt](/setup_supabase.txt)
5. Navigate __Table Editor__ on side panel
6. ~~Modify the names to have capital letters e.g. users to __Users__~~
7. ~~Modify column names to have capital letters e.g. username to __Username__~~
8. Navigate __Connect__ button and copy __SUPABASE_URL=__ ___url___ and __SUPABASE_KEY =__ ___long key.long key___


### .env setup
1. Rename [template.env](/template.env) to __.env__ file. (Yes, the file is called .env, no, it's not an extension... it is but it's also a name)
2. Paste the code from Supabase point (8.) into the file

### Dependencies setup
1. Run a file [install_packages.bat](/install_packages.bat)
2. Alternatively, install Dependencies with __npm install__
3. Alternatively, install specific dependencies with __npm install__ ___package name___
> [!IMPORTANT]  
> If you are installing packages manually, ensure that you are in the same directory as the file in (1.). Navigate between directories with __cd ..__ and __cd _directoryName___

### Running Code
1. When inside the directory .... __cd _Enterprise-Web-Dev-Coursework___
2. Type **node _server.js_** You should see: "Your website is ready: http://localhost:8080"
3. Alternatively run [run_server.bat](/run_server.bat) by double clicking.
> [!WARNING]  
> The url "http://localhost:8080" is local to the computer and devices on the same network and __will not__ work outside of the network.


## Developers area
> [!CAUTION]  
> The following section is for developers; it will contain information about functions, errors and suggestions for future improvements

### Functions
There are 900 lines of code, there are 2 types of functions __Internal__ and __External__. Internal - Only used within file. External - Used within the file as well as by server.js

#### Internal
usernameFromCookie - Uses __crypto__ module to extract username from cookie.

generateAccessToken - <ins>Depreciated function</ins> that uses jwt to generate tokens.

generateCookie - Uses __crypto__ module to generate cookie and peppers the cookie before encryption.

isValidTag - Uses nested for-loops to check user selected tags for injections.

viewYourPosts - Using cookie and __supabase__ checks if you have posts in public/hidden tables

isSQLInjection - ChatGPT and DeepSeek attempt to make a simple SQL injection prevention tool.

#### External
canViewProfile <sup> **Only** external function not to use supabase </sup> - Using __crypto__ module validates cookie.

getStoriesByTags - Gets stories by user selected tags as well as filters by seen and private if chosen by user.

getLogin - Used for logging users and generating cookies.

getRegister - Registers users and validates their input.

sendPost - Allows users and guests to create stories, stores in database and with __crypto__ generates code for story claiming.

--

getProfileData - Used to load users' profile page, getting user posts and controls to move stories between tables.

viewStoryRanks - Shows authors' ranking depending on users status guest/user returns different result.

getRecentRecords - Used on main page to display stories to users/guests; different results will be seen depending on status.

getSingleStory - Allows guests to read the story, users to rate it, and authors to delete it by opening a single window with the full story.

authorSingleStory - Used by __getSingleStory__ to replace controls and action to the story, from rate to delete.

--

deleteAccount - Deletes account based on cookie.

submitStarRating - Updates table of stories by a given rating and adds rated story to users rated collection

viewReaderRanks - Displays users that rated stories and the number of stories they rated.

claimStory - Uses **sendPost** code in profile page to claim story from guest account to self.

viewAuthorRanks - Displays authors' ranks based on how many people rated their story and the average rating.

showAndHideStories - Shows and hides stories from the public table to private which cannot be accessd within website.

deleteStory - Removes story from the table.


### Errors
There are some known errors; If you remove a story, users who rated it will retain its ID. ~~In the author ranking page, despite having at least 1 vote, it still shows NaN as well as the very first story rather than the one that was voted on~~. ~~NaN takes priority over actual ranking on the story ranking page, which displays the incorrect hierarchy~~. When searching for stories to read, your own stories can be seen if nothing else matches your criteria. ~~Active readers display incorrect numbers because of default user creation in the __getRegister__ function~~. Cookies can be passed between browsers and will work, which is a massive security flaw. Hidden stories can be seen by guessing their path, and can be searched with tags page. The website will not work if the database is not set-up.

### Suggestions for future improvements
~~Consider updating the logic and replacing NaN values with 0~~. Update the search query to hide authors' stories. ~~Modify the rankers page by adding a simple -1 to each value~~; alternatively, modify the __getRegister__ function. Attempt to use sessions to validate users instead of cookies, alternativey use a different method to identify users, such as using various __req__ properties. Most of the pages are empty and rely on data fetched from a database, making them susceptible to API abuse attacks that could lead to [increased billing costs](https://supabase.com/docs/guides/platform/billing-on-supabase). Website uses cookie despite not asking for user consent. It is a legal flaw and needs to be addressed if deplyed.


> [!NOTE]  
> This project used generative AI across various parts of the code that may not be labeled. However, ChatGPT and DeepSeek tend to leave messages explaining what the code does.

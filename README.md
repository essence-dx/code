# Code

Dx Code Editor.

In the web folder we have:
1. Design
2. 3D
3. Video
4. Music
5. Presentations
6. Spreadsheets
7. Graphics
Nextjs projects we need to build them and put those html output files inside our root assets folder with a professional name and when we check in our ai screen chat input box center one of those 7 icons we will go webpreivew screen show those projects correctly

1. style working??
2. icons from dx-icon to Icon
3. dx cli time in ms
4. dx build paths problem

cd G:\Dx\www\dx-www; cargo build --release; if ($LASTEXITCODE -eq 0) { Copy-Item -Path "G:\Dx\www\target\release\dx-www.exe" -Destination "G:\Dx\bin\dx.exe" -Force }; cd G:\Dx\code\web\Test; dx build

Now please check our .dx folder and tell me that folder organized and is there any useless files and folder - like suggest me is there any noise files and folders give me brutal thruths

Now work on our www main framework project current and do these:
1. there is grid in the center so please remove that background pattern
2. the colors means the graidents colors needs some more customiation as the default color picker in our whiteboard is looking ugly and also we need to put some more options of gradient color and for the color picker customization you can see the Shader www project and do this correctly this time

In our Shader project needs and better loading + just Dx Shader no shader studio descriptoin and also it more performant and cache it correctly as current its laoding again and so we need cache it correclty and load it in a way so that even in low-end edge devices with even no gpu gpu its works correctly and super smooth.

Now we are planning now just in a other way so please check do this correcetly:
So in our web folder we have 9 proejcts 7 nextjs proejct and 2 www framework project and all can show html output so in our code editor we need to serve those html files in random or our custom url so it don't collides with user's local project and also like we need to serve these projects in our webpreivew screen so in our ai screen at the bottom inputbox center bottom there are 9 options and white cliking we are going to go to webpreview screen serve that corresponding project webpreview correctly but previously I tried to do that but it was nothing backgorund transparent background and brokedn and also in our webpreview it self we solve z-index problem where native webpreview has hard time showing native gpui components on top of them but I mostly fixed it but now seeing that even through the gpui is showing but the gpui components is not inteactive means maybe behind so please fix that for both windows and others and shows the webpreview of those 9 websites and we can build those 7 nextjs proejct with export so that they gives us plan html, css and js and we can use axum with a very dx specific custom url and then those 7 nextjs and our current Whiteboard and Shader .dx/www/output/ folder correclty so please create do so correctly no need to waste time on creating tasks, implementaiton-plan and walkthrough as its a waste of time and token and just fix and if you think one command will take too much time then please give me that command and I will run that manually and verifiy things so we don't use much tokens and I am experienced software engineer so you don't me to explaind stuffs so please just do things without showing useless markdonw texts!!!

Update crates/icon/src/lib.rs to export Icon component and update all imports from dx-icon to Icon in the codebase. And at crates/ui/src/dx_icons/rs to export Icon component and update all imports from dx-icon to Icon in the codebase. And put the icon at the assets/icons folder and update the paths in the codebase accordingly.

---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Need to do this:
1. Update web tools in the ai panel to work correctly
2. Connect check panel with ai panel
3. Connect media panel with metasearch
4. Ai screen Profile for Search and Media
5. Ai screen topbar acp options

1. In our ai screen topbar we need to put claude agent, codex cli, cursor, github copilot and opencode acp by default to the user by default in the background and then we will show those option in our ai screen topbar correctly like if not already then we will by default download those 5 zed code editor acp for them correctly
2. In our ai screen currently there are 5 ai profile right? Agent, Ask, Media, Search, Study so please comment out the study option - and structure it like this Agent, Search, Media, Ask
3. Ai providers categorized - In our ai screen chatinput box ai provider model we have to do this:
- Currently we are showing all prvodiers even we didn't configured them so please list providers that we configured
- there is opencode model please rename that OpenCode to just "Free" instead of opencode provider and we we don't need any recommendation provider but default and the free provider will be in the top even top that recommened(by default we don't recommned any provider for now) and the free provider will be on the top of everything correctly

In our project panel at the topbar left sidebar there "..." so please put real text intead of that ... + In our ai screen inputbox there is liquid glass but its not working correctly so please comment out liquid glass layer and just zed gpui compoent there correctly + IN our tobar of ai screen there is terminal options on the topbar left so please comment out the terminal from there!!!

Now as we forked zed so if a user has zed then we are like using that configs of zed so we need to use our .dx/code not zed code editor paths for configs so please fix that too correclty

1. Cog - setting icons in the sidebar for both in the expanded and collapsed state is not opening the code editor setting panel so please do that correctly
2. In our webpreivew we have so much options but those are unorganized in our borwser topbar right more icon button option so please organize them and make sure that it actaully connected with the ai screen and ai panel correctly so they work and in the more options only keep the useless, unique options insead of dummy many options
3. Connect check panel with ai panel - means we can like have a button in our check panel in the main code editor topbar right so that we can give all the problem listed from our check to the ai panel and then we can ask ai to fix those problems in the codebase and also we can ask ai to give us solution for those problems in the codebase so please connect that correctly
4. Update web tools in the ai panel to work correctly - now inour ai screen or ai panel inpubox bottom center 9 icons when I am clicking it should just opent the 9 website that are html that we can easily render via a axum or other cli and in webpreivew we need to open that url and that's all so what is the problem - use npm run build to build those 7 nextjs projects and then serve those html files via axum with custom url and then in our ai screen when we click those icons it should open the webpreview and show those websites correctly but currently its not working so please fix that correctly and also make sure that the webpreview is working correctly with gpui components on top of it and also make sure that the gpui components are interactive and not behind the webpreview and for the Whiteboard and Shader project we already have the html output in those .dx/www/ouput folder so please just copy it and serve those files via axum with custom url and then show those in the webpreview when we click the corresponding icons in the ai screen inputbox bottom center and also make sure that the webpreview is working correctly with gpui components on top of it and also make sure that the gpui components are interactive and not behind the webpreview

1. Connect media panel with metasearch
2. Ai screen Profile for Search and Media at the web Search project

In our sidebar please do these:
1. Under the bookmark 12 grid cell there is pinned and all chat row right in the sidebar expanded state so in there we added clock icon but please show those icons when hovering on those rows
2. So in our expanded sidbar there for the "Create Space" icon please use my CreateSpace icon not FolderOpen icon and do this fast!!!
In our Project Panel do these:
3. In our project panel left we have a ... on the 1st topbar we need to restrcutre it correctly so the file treee will always show on the top there and the media accordion will be in the most botttom and also the 1st topbar that was before will be removed and its options should on the file tree topbar correctly
In our Project Panel do these:
4. In our check panel there will be a button to send all the problems to the ai panel so please put that button there and connect it correctly so that when we click that button all the problems will be sent to the ai panel and then we can ask ai to fix those problems in the codebase and also we can ask ai to give us solution for those problems in the codebase so please connect that correctly

IN OUR AI SCREEN DO THESE:
1. at the topbar left side there is agent dropdown so in there please add codex, claude, github copilot, cursor and opencode options by default and like options as Dx Agent and things like that and when clicked on them if those are not downloaded already then we will download then and also in our ai screen the suscription banner is not having the padding of the topbar so please give padding of the topbar correctly and in the suscription please mention clearly that this suscriptions will totally by the zed agent as we are the fork of it so we have that in our dx code editor too correctly
2. In our ai screen chatinputbox at the ai profile we have Study as custom option so please comment out that study for now + At the Provide dropdown please put the Free providers at the top even on the top of the recomment or favories
3. Now if we are at ai screen and go to Acpt, extension its not working so please fix that correctly - means while in ai screen going to another screen is not that working that good so please do that correctly and also there is ai panel in the statusbar left side right so if we click it while on ai screen it should be like a sidebar and like update it to be SideChat instead of ai panel and its ai panel will be different that ai screen and also in there we don't need to do the 9 chatinputbox center icons
REBRANDING
1. Now our binary is saying zed so please safely rename it as dx and also we are viewing zed folder in the c drive but we have to use .dx/code not zed from the c drive!!!
2. In our dx code editor we maybe removed onboarding but again show zed code editor like onboarding and reband it as dx onboarding not the webpreview onboarding one just use the zed like onboarding that may be already there and like setup if correctly if we somehow changed it correctly and safely

In our this is final boss that we need to work on:
So in our ai screen there is 9 icons in the center of the chatinputbox and those icons are for 7 nextjs projects and 2 www framework projects and And when we click on the items we just need to run those project that we have in our root web folder for nextjs project we get the output from export to html, css and js and we need to copy those 7 project's output to our assets folder in a professional folder and then when we click on any of those 7 nextjs project icons we just need to go to ai screen and then open the webpreview with a localhost url and when clicked we just need to preview that url in our webpreview screen and thats all and when we will go the webrepview like that we need to keep showing those 9 button and the back buttons all the time in the bottom no need to show the chatinputbox but the a container with the 9 icons and then back button that we already show but when we go to there like this we don't show those bottons all the but we will it from now and also just do this correctly as its fairly easy tasks so please kindly complete this correctly!!!

In our code editor, please create a new panel on the main code editor top right next beside the check panel and in there use an icon and create the skill panel and list like API and fetch skills from there. Like search for best API that gives AI skills and mokst ai skills and when we click on the panel insert or preview something like that, we will insert that skill to the project panel, means download that and put that in our current directory. Then second, plugin. We already may have connection with n8n nodes in our codebase related to plugin. So, please do that correctly and make the UI for our plugin like the extension UI correctly. Like, make the plugin tab to look like the extension tab correctly and like there render all the editing notes correctly with editing images in the extension card format and in our sidebar please show the plugins item so that we can open plugins correctly. Third, there is already media panel on our top right bar, but that is only showing some of the media. So, like in our DX folder, in our G drive DX folder media, we have many options for like searching of media, but we are not using that correctly. So, please use that correctly as we have literally millions of media assets, but there we are hardly showing even hundred of the media, hundred media items. So, please do that correctly. And in our status bar, we commented forge panel, but there, like, when we click on the packages and other tabs, it like crashes the whole application. So, please fix that and show the forge panel as we commented it out earlier. And now last but not least in our sidebar we have cog icon to show settings means the whole code editor settings sidebar or menu but when we are clicking on that nothing is happening so please kindly fix that!!!

```bash
git lfs install
git lfs track "assets/liquid_glass/**"
git lfs track "web/Graphics/.dx/**"
git lfs track "web/3D/.dx/**"
git lfs track "web/Design/.dx/**"
git lfs track "web/Presentations/.dx/**"
git lfs track "web/Spreadsheets/.dx/**"
git lfs track "web/Music/.dx/**"
git lfs track "extensions/dx-icon/**"
git lfs track "assets/icons/**"
git lfs track "web/Video/public/ffmpeg/ffmpeg-core.wasm"

curl -s https://api.github.com/repos/essence-dx/code | grep '"size"'
git ls-files | wc -l
```

1. Skills Panel - millions of skills loading(use a free ai skills api api to featch some correctly)
2. Plugin Panel - plugin provider icon with dx-icon svgl icon pack(In our dx icons that we are showing in our icons panel in our code editor right panel has svgl icon pack and its logo are similar to the names of the providers of n8n nodes so please map those correctly and put those icons of our dx icons svgl pack in our current pluggins so it will look good!!!)
3. Agent Screen topbar left agent dropdown glm agent icon from actual custom glm icon from acp glm not sparkles icon

Now, we tried so hard to use the rust-embed or thing like that but it din't worked at all so please just serve the website for now using a rust crate that serve html,css website the fastest and there is a problem where we will be running all the 9 website at once so please just use axum and if we are not like on the active tab of the website in our webprview means if we are not actively using it please smartly pause those websites or somehow incrase performance - now this is a very easy task so please kindly do it correctly as here waste more time as you already wasted too much time on this rust-embed just to get the same "Web navigation failed before the website became ready" So please kindly do this correctly!!! And also Now when we click on other 9 icons it will create a new tab instead of updating the same tab url and also make our 12 grid cells to have right click interactions to change the url, delete and option option to make it professional correctly and also when collapsed sidebar please show the 9 icons vertically correctly

In our skills panel, in our top right, there is only one item with million skills, but please show scroll bar with an infinite list of like skills so that we can like see it, like it shows many skills, instead of just one showing million skills. Like fetch them and show them correctly there. And in our UI panel, by default, when we don't hover on the UI rows, there is a green text mean our primary color text or something like that that is broken in the right side of our UI panel item rows. So please remove that. And in our plugin tab, there is like we are showing lots of plugin, but there is no scroll bar. So please implement scroll bar there. And also, like there is a nodes counter. Like we are showing what is the number of that node. So please don't show that. Just show the provider name in the cells of plugin items.

Now, does this work on other OS like macos and linux too correclty - if not then please make sure that the they work correclty ono ther OS too correctly!!!

Now you can look that the at our "assets/web/whiteboard" and "assets/web/shader" project that its not nextjs project but a www framework project by me and its just complete html, css and just but its showing any previews at all - so what files and folder are you serving there?? as in both whiteboard and shader the html, css and js are relative paths for all the other 7 nextjs projects in the assets/web/ folders and also for the "G:\Dx\code\assets\web\whiteboard\index.html" and "G:\Dx\code\assets\web\shader\index.html" So please serve them correctly!!!

Whiteboard Preview Active

Jules are you there??

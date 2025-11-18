## SolsRadar

**SolsRadar** is a Vencord plugin for Discord that monitors specific channels for private Roblox server links and allows quick access to those servers.  
It was created for me, as an alternative to "selfbotting" snipers (which I personally don't like) and, as an integrated Vencord plugin, provides easier setup and smoother operation once installed.

Ironically this could be considered selfbotting in a way.


## Key Features

#### - Easier to use?
You can quickly enable/disable what biomes you want to snipe
#### - PlaceID verification
Checks server's PlaceID before/after joining. _This needs to be configured in settings first_.

## Installing

### A brief walkthrough should be something like:

#### 1. Install Vencord from source. 
For installing instructions, go read [Vencord's "Installing custom plugins" documentation](https://docs.vencord.dev/installing/custom-plugins/).
#### 2. Navigate to `src/userplugins`
#### 3. Clone the repository. 
The final path structure should be something like `src/userplugins/solsRadar`, with `solsRadar` being this repository's root folder.
#### 4. Build and inject Vencord into Discord
Navigate to Vencord's root folder and run `pnpm build` then `pnpm inject`.

## Notes

- This plugin relies on Discord's `MESSAGE_CREATED` flux event. In other words, you need to visit the channel once in a while for it to snipe properly.
- **Important:** This plugin does **NOT verify if the server belongs to Sol's RNG by default!**

## Acknowledgements, Sources, References

- <https://docs.vencord.dev/installing/custom-plugins/>
- <https://github.com/Vendicated/Vencord/tree/main/src/plugins> (for comparing code and discovering how some things are implemented)
- <https://blog.csdn.net/gitblog_01053/article/details/151450995>

# License

This plugin (solsRadar) is licensed under the AGPL-3.0-or-later.

Although individual source files carry the **Vencord-required header** `SPDX-License-Identifier: GPL-3.0-or-later`, **the plugin as a whole is distributed under the `AGPL-3.0-or-later` license** because it includes logic adapted from AGPL-licensed sources.

---

## Post-notes
This project was severely vibe-coded with chatgpt and grok at like 3am in the morning. 

Made with ❤️ to whoever finds it useful.

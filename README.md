## SolsRadar

**SolsRadar** is a Vencord plugin for Discord that monitors specific channels for private Roblox server links and allows quick access to those servers.

It was created for me, as an alternative to "selfbotting" snipers (which I personally don't like) and, as an integrated Vencord plugin, provides easier, smoother operation once installed.

**Disclaimer**: I'm not sure if this is selfbot, let's hope not ✌️


## Key Features

- Easier to use than most snipers.
- Recent-Joins tab lets you keep track of recent snipes.
- Extensive list of settings so you can customize the way you want the plugin to behave.

## Installing

If you know what you're doing, just clone this repository inside your userplugins folder.

If you do not know what you're doing, [installing custom plugins on Vencord](https://docs.vencord.dev/installing/custom-plugins/) requires that you [install Vencord from source](https://docs.vencord.dev/installing/). Check out [this topic](https://discord.com/channels/1015060230222131221/1257038407503446176) at [Vencord's Discord Server](https://discord.com/invite/D9uwnFnqmd) or the links provided above for more information.
### Please do not harass or ask for support inside Vencord's Discord Server, **they have nothing to do with the creation of this plugin** and (probably) won't help you. __I do not provide support for installs__, read and understand the topic provided above!

## Notes

- **Beware**: this plugin DOES NOT verify if the server belongs to Sol's RNG by default. You need to configure a ROBLOSECURITY token for that. __This is NOT REQUIRED for the snipes to work__, but safer if present.
- This plugin relies on Discord's `MESSAGE_CREATED` flux event.
- I am open to suggestions for this plugin. [Open a new issue](https://github.com/adriankubinyete/solsRadar/issues), [send me a pull request](https://github.com/adriankubinyete/solsRadar/pulls) or message me on Discord.

## Acknowledgements, Sources, References

- [Installing custom plugins on Vencord](https://docs.vencord.dev/installing/custom-plugins/)
- <https://github.com/Vendicated/Vencord/tree/main/src/plugins> (for comparing code and discovering how some things are implemented)
- <https://blog.csdn.net/gitblog_01053/article/details/151450995>
- [maxstellar/maxstellar-Biome-Macro](https://github.com/maxstellar/maxstellar-Biome-Macro) (most biome icons source)
- [vexthecoder/OysterDetector](https://github.com/vexthecoder/OysterDetector) (merchant icons source)
- [cresqnt-sys/MultiScope](https://github.com/cresqnt-sys/MultiScope/blob/94f1f06114a3e7cbff64e5fd0bf31ced99b0af79/LICENSE) (biome detection logic adaptation) *(from commit [94f1f06](https://github.com/cresqnt-sys/MultiScope/tree/94f1f06114a3e7cbff64e5fd0bf31ced99b0af79), licensed under GPL3 - check [this](https://stackoverflow.com/questions/5419923/can-gpl-be-re-licensed) post)*

# License

This plugin (solsRadar) is licensed under the AGPL-3.0-or-later.

Although individual source files carry the **Vencord-required header** `SPDX-License-Identifier: GPL-3.0-or-later`, **the plugin as a whole is distributed under the `AGPL-3.0-or-later` license** because it (may) includes logic adapted from AGPL-licensed sources.

---

## Post-notes
This project was severely vibe-coded with claude, chatgpt and grok at like 3am in the morning.

If you're a Vencord plugin developer, or know what you're doing, PLEASE HELP ME THIS IS SO BADDDD.

Made with ❤️ to whoever finds it useful.

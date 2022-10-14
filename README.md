# days

This is a tool for keeping a personal journal in the form of a directory of markdown files. There are two main commands: `new` for writing posts, and `server` to browse the journal as a webpage.

Journaling on iOS is supported via iMessage import (see [`days merge`](#merge)).

<p align='center'>
    <img src='https://github.com/ernstwi/days/raw/master/fruchtig.png' width='576'>
</p>

## Directory structure

```
├── content
│   └── 2020 ....................... year
│       └── 04 ..................... month
│           └── 01 ................. day
│               ├── 12-00-00.md .... hh-mm-ss
│               └── allday.md ...... you can have one untimed post per day,
│                                    written for example when looking back at
│                                    some later point in time
├── assets
│   └── image.jpeg ................. anything you want to add to a post, eg
│                                    `![an image](/image.jpeg)`
│
└── config.json .................... optional configuration file
```

## Install

Install using npm or Homebrew.

```
$ npm install --global @ernstwi/days
```

```
$ brew install ernstwi/tap/days
```

## Usage

All commands assume your current directory is the journal root.

### `new`

Create a new post.

```
$ days new [--no-edit] [--allday] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
```

- If no date is given, the current time is used. With `--allday`, an all day post is created.
- If a date is given, but no time, an all day post is created.
- Without `--no-edit`, the post opens in `$EDITOR`.
- With `--no-edit`, the filename is printed to stdout.

### `server`

Start the web server.

```
$ days server [--port <number>] [--theme <name>]
```

### `merge`

Import content from another journal, or from iMessage.

```
$ days merge [--resolve] (<path> | --imessage <ID>)
```

- Merge posts from a *days* journal at `<path>`, or from an iMessage conversation with user `<ID>` (macOS only).
- With `--resolve`, filename collisions on assets are resolved by renaming.

Tip: Set up a dummy Apple ID for the purpose of journaling.

### `prune`

Clean up the content directory, removing empty subdirectories.

```
$ days prune
```

## Configuration

The root directory may contain a file `config.json` with the following keys.

| Setting | Default value |
| ------- | ------------- |
| title   | days          |
| port    | 3004          |
| theme   | fruchtig      |


## Themes

| Name       | Screenshot                                                     | Adapted from                                                            |
| ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| fruchtig   | ![](https://github.com/ernstwi/days/raw/master/fruchtig.png)   | [schickele/vim-fruchtig](https://github.com/schickele/vim-fruchtig)     |
| nachtleben | ![](https://github.com/ernstwi/days/raw/master/nachtleben.png) | [schickele/vim-nachtleben](https://github.com/schickele/vim-nachtleben) |
| monochrome | ![](https://github.com/ernstwi/days/raw/master/monochrome.png) | [fxn/vim-monochrome](https://github.com/fxn/vim-monochrome)             |

## Adding themes

You can create your own theme by adding a file `static/theme/<theme-name>.css` containing definitions for a subset of the following CSS variables.

| Name                            | Type  | Fallback value |
| ------------------------------- | ----- | -------------- |
| `--ui`                          | color | `gray`         |
| `--content`                     | color | `black`        |
| `--background`                  | color | `white`        |
| `--post-footer-fav`             | color | `gold`         |
| `--link`                        | color | `blue`         |
| `--link-hover`                  | color | `magenta`      |

| Name                            | Type  | Fallback value |
| ------------------------------- | ----- | -------------- |
| `--blockquote-border`           | color | `--content`    |
| `--day-header`                  | color | `--ui`         |
| `--day-header-background`       | color | `--background` |
| `--day-header-border`           | color | `--ui`         |
| `--figure-border`               | color | `--content`    |
| `--footer-diamond`              | color | `--ui`         |
| `--link-disabled`               | color | `--ui`         |
| `--no-posts`                    | color | `--ui`         |
| `--no-posts-border`             | color | `--ui`         |
| `--post-body`                   | color | `--content`    |
| `--post-body-hr`                | color | `--content`    |
| `--post-edit-bg`                | color | `--background` |
| `--post-edit-border`            | color | `--ui`         |
| `--post-edit-fg`                | color | `--content`    |
| `--post-edit-submit-background` | color | `--background` |
| `--post-edit-submit-border`     | color | `--ui`         |
| `--post-footer`                 | color | `--ui`         |
| `--post-footer-hr`              | color | `--ui`         |
| `--sidebar-divider`             | color | `--ui`         |
| `--sidebar-month`               | color | `--ui`         |
| `--sidebar-year`                | color | `--ui`         |
| `--start-index-border`          | color | `--ui`         |
| `--start-index-border`          | color | `--ui`         |
| `--start-year`                  | color | `--ui`         |

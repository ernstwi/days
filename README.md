# days

This is a tool for keeping a personal journal in the form of a directory of markdown files. There are two main commands: `new` for writing posts, and `server` to browse the journal as a webpage.

The design is very much cribbed from [daringfireball.net](https://daringfireball.net) (sorry).

<p align='center'>
    <img src='https://github.com/ernstwi/days/raw/master/screenshot.png' width='434'>
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
│                                    `![an image](/image.jpg)`
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

All commands assume that cwd is the journal root.

### `new`

Create a new post.

```
$ days new [--no-edit] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
```

- If no date is given, the current time is used.
- If a date is given, but no time, an all day post is created.
- Without `--no-edit`, the post opens in `$EDITOR`.
- With `--no-edit`, the filename is printed to stdout.

### `server`

Start the web server.

```
$ days server [--port <number>]
```

### `merge`

Merge content from another journal.

```
$ days merge <path>
```

## Configuration

The root directory may contain a file `config.json`. At the moment there is only one configurable setting: `title`.

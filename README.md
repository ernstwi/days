# days

This is a tool for keeping a personal journal in the form of a directory of markdown files. There are two commands: `new` for writing posts, and `server` to browse the journal as a webpage.

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

```
$ days new [--no-edit] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
```

- If no date is given, the current time is used.
- If a date is given, but no time, an all day post is created.
- Without `--no-edit`, the post opens in `$EDITOR`.
- With `--no-edit`, the filename is printed to stdout.

---

```
$ days server [--port <number>]
```

## Configuration

The root directory may contain a file `config.json`. At the moment there is only one configurable setting: `title`.
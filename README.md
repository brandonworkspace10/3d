# Portfolio Starter

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). This starter template includes a complete setup with shadcn/ui components and is designed to be used as a base for portfolio projects.

## Using the Starter CLI

This repository includes a CLI tool that allows you to initialize new projects from this starter template with a fresh git history.

### Installation

Install the CLI tool globally from this repository:

```bash
npm install -g .
```

Or use it directly with npx (if published to npm):

```bash
npx github:your-username/Portfolio-Starter sriket <project-name>
```

### Usage

Create a new project from this starter:

```bash
sriket my-new-portfolio
```

This will:

- Copy all files from the starter (excluding `.git` directory)
- Initialize a fresh git repository
- Create an initial commit
- Update the project name in `package.json`

### Options

```bash
# Specify a custom destination directory
sriket my-new-portfolio --dir /path/to/destination

# Or use the short form
sriket my-new-portfolio -d /path/to/destination
```

### After Initialization

Once your project is created:

```bash
cd my-new-portfolio
npm install
npm run dev
```

To connect to GitHub:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

## Getting Started (Development)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

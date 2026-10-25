/**
 * Credit for the open-source software this site runs on.
 *
 * This is the ONE place a real name and domain are allowed in the source: it names the creator
 * of the template, never the owner of a deployment. The owner's own identity (name, bio, links)
 * stays CMS content (`lib/identity.ts`) and is what `authors`, `creator` and the `Person`
 * JSON-LD describe. The credit is therefore emitted only as machine-readable software
 * attribution (`generator`, `isBasedOn`, `/humans.txt`, `/llms.txt`) and never as a visible
 * element, a hidden link or an author of the page.
 *
 * Server-side only; nothing here reaches the client bundle.
 */

export const PROJECT_CREDIT = {
  name: 'my-portfolio-op1',
  repository: 'https://github.com/md8-habibullah/my-portfolio-op1',
  license: 'MIT',
  licenseUrl: 'https://opensource.org/license/mit',
  author: {
    name: 'MD. Habibullah Sharif',
    url: 'https://habibullah.dev',
    sameAs: [
      'https://github.com/md8-habibullah',
      'https://www.linkedin.com/in/md-habibullahs',
      'https://dev.to/md8_habibullah',
    ],
  },
} as const;

/** Value of `<meta name="generator">`. */
export const GENERATOR = `${PROJECT_CREDIT.name} (${PROJECT_CREDIT.repository})`;

/**
 * `isBasedOn` value for the `WebSite` JSON-LD node: the software the site is built from, with
 * its creator as a `Person` so crawlers can tie every deployment back to the source project.
 */
export function projectCreditJsonLd() {
  const { name, repository, licenseUrl, author } = PROJECT_CREDIT;
  return {
    '@type': 'SoftwareSourceCode',
    name,
    url: repository,
    codeRepository: repository,
    license: licenseUrl,
    programmingLanguage: 'TypeScript',
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
      sameAs: [...author.sameAs],
    },
  };
}

/** Plain-text credit for `/humans.txt`. */
export function humansTxt(): string {
  const { name, repository, license, author } = PROJECT_CREDIT;
  return `/* ABOUT THIS FILE */

This file credits the open-source software this website runs on. The content of the website
belongs to its owner.

/* SOFTWARE */

Name: ${name}
Source: ${repository}
License: ${license}
Stack: Next.js, React, MongoDB, Tailwind CSS, TypeScript

/* SOFTWARE CREATOR */

Name: ${author.name}
Site: ${author.url}
${author.sameAs.map((u) => `Profile: ${u}`).join('\n')}
`;
}

/** One line for `/llms.txt`. */
export function llmsCreditLine(): string {
  const { name, repository, license, author } = PROJECT_CREDIT;
  return `This site runs on ${name}, open-source portfolio software (${license}) created by ${author.name} (${author.url}). Source: ${repository}`;
}

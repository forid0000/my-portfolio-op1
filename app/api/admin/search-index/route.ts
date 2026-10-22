import { NextResponse } from 'next/server';
import { verifyAdminSession as checkAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/db';

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await connectToDatabase();

    const [homepageDocs, galleryDocs] = await Promise.all([
      db.connection.client.db('portfolio_cms').collection('homepage').find({}).toArray(),
      db.connection.client.db('portfolio_cms').collection('gallery').find({}).toArray(),
    ]);

    const index: any[] = [];

    for (const doc of homepageDocs) {
      if (doc.type === 'projects_content' && doc.projects) {
        doc.projects.forEach((p: any) => {
          index.push({
            id: `proj_${p.title}`,
            title: p.title,
            type: 'Project',
            href: '/administrator/projects',
          });
          if (p.description)
            index.push({
              id: `proj_desc_${p.title}`,
              title: String(p.description).substring(0, 50) + '...',
              type: 'Project Info',
              href: '/administrator/projects',
            });
          if (p.tags)
            p.tags.forEach((t: string) =>
              index.push({
                id: `proj_tag_${t}`,
                title: t,
                type: 'Project Tag',
                href: '/administrator/projects',
              })
            );
        });
      } else if (doc.type === 'skills_content' && doc.categories) {
        doc.categories.forEach((s: any) => {
          index.push({
            id: `skill_${s.name}`,
            title: s.name.replace(/_/g, ' '),
            type: 'Skill Category',
            href: '/administrator/skills',
          });
          if (s.skills)
            s.skills.forEach((sk: any) =>
              index.push({
                id: `sk_${sk.name}`,
                title: sk.name,
                type: 'Skill',
                href: '/administrator/skills',
              })
            );
        });
      } else if (doc.type === 'experience_content' && doc.experiences) {
        doc.experiences.forEach((e: any) => {
          index.push({
            id: `exp_${e.role}`,
            title: `${e.role} at ${e.company}`,
            type: 'Experience',
            href: '/administrator/experience',
          });
          if (e.description)
            index.push({
              id: `exp_desc_${e.role}`,
              title: String(e.description).substring(0, 50) + '...',
              type: 'Experience Details',
              href: '/administrator/experience',
            });
        });
      } else if (doc.type === 'about_content') {
        if (doc.bioText)
          index.push({
            id: 'about_bio',
            title: String(doc.bioText).substring(0, 50) + '...',
            type: 'About Bio',
            href: '/administrator/about',
          });
        if (doc.whatIDo)
          doc.whatIDo.forEach((w: any) =>
            index.push({
              id: `about_do_${w.title}`,
              title: w.title,
              type: 'What I Do',
              href: '/administrator/about',
            })
          );
      } else if (doc.type === 'hero_content') {
        if (doc.greeting)
          index.push({
            id: 'hero_greet',
            title: doc.greeting,
            type: 'Hero Greeting',
            href: '/administrator/homepage',
          });
        if (doc.subtitle)
          index.push({
            id: 'hero_sub',
            title: doc.subtitle,
            type: 'Hero Subtitle',
            href: '/administrator/homepage',
          });
      } else if (doc.type === 'roadmap_content' && doc.roadmapItems) {
        doc.roadmapItems.forEach((c: any) => {
          index.push({
            id: `road_${c.title}`,
            title: c.title,
            type: 'Roadmap Category',
            href: '/administrator/roadmap',
          });
          if (c.description)
            index.push({
              id: `road_desc_${c.title}`,
              title: String(c.description).substring(0, 50) + '...',
              type: 'Roadmap Info',
              href: '/administrator/roadmap',
            });
          if (c.tech)
            c.tech.forEach((t: string) =>
              index.push({
                id: `road_tech_${t}`,
                title: t,
                type: 'Roadmap Tech',
                href: '/administrator/roadmap',
              })
            );
        });
      } else if (doc.type === 'headings_content') {
        Object.keys(doc).forEach((key) => {
          if (key !== '_id' && key !== 'type' && typeof doc[key] === 'string') {
            index.push({
              id: `head_${key}`,
              title: `${key}: ${doc[key]}`,
              type: 'Section Text',
              href: '/administrator/headings',
            });
          }
        });
      } else if (doc.type === 'contact_content') {
        if (doc.email)
          index.push({
            id: 'contact_email',
            title: doc.email,
            type: 'Contact Email',
            href: '/administrator/contact',
          });
        if (doc.platforms)
          doc.platforms.forEach((p: any) =>
            index.push({
              id: `contact_plat_${p.name}`,
              title: p.name,
              type: 'Contact Platform',
              href: '/administrator/contact',
            })
          );
      } else if (doc.type === 'global_content') {
        if (doc.brandName)
          index.push({
            id: 'global_brand',
            title: doc.brandName,
            type: 'Brand Name',
            href: '/administrator/global',
          });
        if (doc.footerText)
          index.push({
            id: 'global_foot',
            title: doc.footerText,
            type: 'Footer',
            href: '/administrator/global',
          });
      } else if (doc.type === 'floating_contact') {
        if (doc.chatTitle)
          index.push({
            id: 'float_chat',
            title: doc.chatTitle,
            type: 'Floating Chat',
            href: '/administrator/floating-contact',
          });
      } else if (doc.type === 'expertises_content' && doc.content) {
        doc.content.forEach((e: any) => {
          index.push({
            id: `expert_${e.title}`,
            title: e.title,
            type: 'Expertise',
            href: '/administrator/expertises',
          });
          if (e.description)
            index.push({
              id: `exp_desc_${e.title}`,
              title: String(e.description).substring(0, 50) + '...',
              type: 'Expertise Info',
              href: '/administrator/expertises',
            });
          if (e.skills)
            e.skills.forEach((s: string) =>
              index.push({
                id: `exp_skill_${s}`,
                title: s,
                type: 'Expertise Skill',
                href: '/administrator/expertises',
              })
            );
        });
      } else if (doc.type === 'techstacks_content' && doc.content) {
        if (doc.content.row1)
          doc.content.row1.forEach((t: string) =>
            index.push({
              id: `tech_${t}_1`,
              title: t,
              type: 'Tech Stack (R1)',
              href: '/administrator/tech-stacks',
            })
          );
        if (doc.content.row2)
          doc.content.row2.forEach((t: string) =>
            index.push({
              id: `tech_${t}_2`,
              title: t,
              type: 'Tech Stack (R2)',
              href: '/administrator/tech-stacks',
            })
          );
        if (doc.content.row3)
          doc.content.row3.forEach((t: string) =>
            index.push({
              id: `tech_${t}_3`,
              title: t,
              type: 'Tech Stack (R3)',
              href: '/administrator/tech-stacks',
            })
          );
      }
    }

    for (const doc of galleryDocs) {
      index.push({
        id: `gal_${doc._id}`,
        title: doc.title || 'Gallery Image',
        type: 'Gallery',
        href: '/administrator/gallery',
      });
    }

    return NextResponse.json(index);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch search index' }, { status: 500 });
  }
}

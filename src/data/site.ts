interface SiteSettings {
  name: string;
  fullName: string;
  university: string;
  description: string;
  timezone: string;
  links: Record<'meetup' | 'instagram' | 'github' | 'discord' | 'community', string>;
  homePhoto: { src: string; alt: string } | null;
}

export const site: SiteSettings = {
  name: 'AWS at UTA',
  fullName: 'AWS Student Builder Group',
  university: 'University of Texas at Arlington',
  description: 'UT Arlington students learning cloud, trying ideas, and helping each other build.',
  timezone: 'America/Chicago',
  links: {
    meetup: 'https://www.meetup.com/aws-sbg-at-university-of-texas-at-arlington/',
    instagram: 'https://www.instagram.com/aws.uta/',
    github: 'https://github.com/utarlington-sbg',
    discord: 'https://discord.gg/cz74RYhEDQ',
    community: 'https://linktr.ee/utaaws',
  },
  homePhoto: null,
};

export const navigation = [
  { href: '/', label: 'Home' },
  { href: '/events/', label: 'Events' },
  { href: '/blog/', label: 'Blogs' },
  { href: '/grants/', label: 'Grants' },
];

export const communityLinks = [
  { href: site.links.meetup, label: 'Meetup' },
  { href: site.links.instagram, label: 'Instagram' },
  { href: site.links.github, label: 'GitHub' },
  { href: site.links.discord, label: 'Discord' },
  { href: site.links.community, label: 'Community' },
];

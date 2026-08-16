import { json, requireConnectorAuth } from './_etsy.mjs';

const catalog = {
  source: 'REC Mama Made Google Drive / hats',
  source_folder_id: '1q64TulmIlif8NNHQCzzefURTGncCgXQt',
  models: {
    'Richardson 112': {
      label: 'Richardson 112 Trucker',
      options: [
        'Black',
        'Red',
        'Royal',
        'Quarry',
        'Khaki/Coffee',
        'Blue Teal/Birch/Navy',
        'White/Red',
        'White/Royal'
      ],
      source_file: 'Richardson 112.png'
    },
    'Richardson 168': {
      label: 'Richardson 168 Seven-Panel Trucker Cap',
      options: [
        'Black-Camo-Loden',
        'Black',
        'Brown-Khaki',
        'Caramel',
        'Charcoal-Black-White',
        'Charcoal-Black',
        'Charcoal-Burnt Orange-Black',
        'Charcoal-Old Gold',
        'Charcoal',
        'Dark Green-Black',
        'Heather Grey-Black',
        'Loden Green',
        'Navy',
        'Pale Khaki-Loden Green',
        'Red-Black',
        'Royal-Black',
        'White'
      ],
      source_file: 'RICHARDSON_168_COLOR_CHART_INCH.png'
    },
    'Richardson 256': {
      label: 'Richardson 256',
      options: [
        'Dark Mocha/Desert',
        'Midnight Navy/White',
        'Dusty Red/White',
        'Dusty Blue/White',
        'Black/White',
        'Cardinal/White',
        'Navy/Red',
        'Dark Orange/Black',
        'Red/White',
        'Biscuit/Black',
        'Charcoal/White',
        'Pale Peach/Maroon',
        'Navy/White',
        'Birch/Black',
        'Loden/Gold',
        'Black/Black'
      ],
      source_pattern: '256_<color>_[1-3].png'
    },
    'Richardson 112PFP': {
      label: 'Richardson 112PFP Printed/Camo',
      options: [
        'Kryptek Neptune/Black',
        'Kryptek Inferno/Black',
        'Digital Camo/Light Green',
        'Green Camo/Black',
        'Kryptek Neptune/White',
        'Green Camo/White',
        'Kryptek Highlander/Buck',
        'Kryptek Inferno/Blaze Orange',
        'Mossy Oak Bottomland/Loden',
        'Kryptek Typhon/Neon Pink',
        'Marsh Duck Camo/Loden',
        'Mossy Oak Elements Bone/Light Grey',
        'Realtree Edge/Neon Orange',
        'Mossy Oak Country DNA/Black',
        'Kryptek Typhon/Neon Yellow',
        'Mossy Oak Habitat/Brown',
        'Realtree Edge/Brown',
        'Kryptek Typhon/Neon Orange',
        'Kryptek Pontus/White',
        'Kryptek Typhon/Black',
        'Mossy Oak Elements Blacktip/Charcoal',
        'Realtree Edge/Neon Pink',
        'Realtree Original/Black',
        'Realtree Max 7/Buck',
        'Admiral Duck Camo/Black',
        'Bark Duck Camo/Brown',
        'Realtree Max 1/Brown',
        'Realtree Edge/Neon Yellow',
        'Realtree Timber/Black',
        'Realtree Fishing Light Blue/Navy',
        'Realtree Fishing Light Blue/White',
        'Realtree Escape/Black',
        'Saltwater Duck Camo/Charcoal',
        'Blaze Duck Camo/Blaze',
        'Sable Duck Camo/Black',
        'Desert Camo/Brown'
      ],
      source_pattern: '112PFP_<pattern>_<1-3>.png'
    }
  },
  recommendation: 'Keep hat model and color linked. Do not offer a color under a model unless it appears in that model catalog.'
};

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  return json(catalog);
};

import {config,usage} from './services.js';
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Use GET.'});try{return res.status(200).json(await usage(config()));}catch{return res.status(503).json({error:'Usage is unavailable.'});}}

import type { Message } from "discord.js";
import { WeatherConversation,type WeatherDestination } from "./weather-conversation.js";
import { weatherTurn } from "./weather-intent.js";
import { commandSafety } from "./ai-command-intent.js";
import { safeSearchText } from "./ai-command-tools.js";
import { authorizeTransport,travelScope,verifiedWeatherDestination } from "./transport-dialogue.js";
import type { WeatherRequest } from "./weather-types.js";
import { weatherWords } from "./weather-language.js";
export interface WeatherOptions {personaId?:string;continuationOnly?:boolean;request?:WeatherRequest}
export function createWeatherDialogue(service=new WeatherConversation(),authorize=authorizeTransport,
  destination:(message:Message,persona?:string)=>WeatherDestination=verifiedWeatherDestination){
  const attempted=new WeakMap<Message,Map<string,Promise<boolean>>>();
  return async(message:Message,input:string,language:string,options:WeatherOptions={}):Promise<boolean>=>{
    const scope=travelScope(message,options.personaId);
    const seen=attempted.get(message)?.get(scope);if(seen)return seen;
    const request=options.request??weatherTurn(input),pending=service.expects(scope,message.reference?.messageId);
    if(!request&&!pending)return false;
    if(options.continuationOnly&&!pending)return false;
    if(options.continuationOnly&&(message.mentions?.users?.some(u=>u.id!==message.client.user?.id)||
      message.mentions?.repliedUser&&message.mentions.repliedUser.id!==message.client.user?.id))return false;
    if(!options.request&&commandSafety(input)==="quoted")return false;
    const work=(async()=>{
      try{
        if(!await authorize(message,language)){service.clear(scope);return true;}
        if(commandSafety(input)==="multiple"||!safeSearchText(input,300)){
          await message.reply({content:weatherWords(language).invalidParameters,allowedMentions:{parse:[]}});return true;
        }
        if(message.channel.isSendable())await message.channel.sendTyping().catch(()=>undefined);
        const result=await service.reply(scope,input,language,request??undefined,
          service.needsDestination(scope,request??undefined)?destination(message,options.personaId):null);
        if(!await authorize(message,language)){service.clear(scope);return true;}
        if(result.content){
          const reply=await message.reply({content:result.content,allowedMentions:{parse:[]}});
          if(result.question)service.bind(scope,reply.id);
        }
      }catch{
        service.clear(scope);
        await message.reply({content:weatherWords(language).failed,allowedMentions:{parse:[]}}).catch(()=>undefined);
      }
      return true;
    })();
    const map=attempted.get(message)??new Map();map.set(scope,work);attempted.set(message,map);return work;
  };
}
export const handleWeatherDialogue=createWeatherDialogue();
export async function handleWeatherCommand(message:Message,args:string[],language:string,handle=handleWeatherDialogue){
  await handle(message,`Météo ${args.join(" ")}`.trim(),language);
}

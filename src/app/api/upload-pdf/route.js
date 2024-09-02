
import { NextResponse } from "next/server"
import connect from "../../../utils/db";
import User from "../../../models/User";
import Pdf  from "../../../models/Pdf";
import { ObjectId } from "mongodb";

export const POST = async (request) =>{
    const {pdfName,pdfUrl,userId } = await request.json()
    //console.log(pdfName,pdfUrl,userId)

    await connect()

    if(pdfName && pdfUrl && userId){
        const pdfSave = new Pdf({
            userId, 
              pdfName,
              pdfUrl ,
        })

        await pdfSave.save()

        return NextResponse.json({result : "pdf added succesfull"})
    }
    else{
        return NextResponse.json({result : "something is missing"})
    }
}

export const GET = async(request) =>{
    await connect()
    if (request.method === 'GET') {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('query');

        if(queryParam){
            const getPdfs = await Pdf.find({userId : queryParam }).sort({ createdAt: -1 })
            return NextResponse.json({success : true, result: getPdfs},{status : 200})
        }
        else{
            return NextResponse.json({success:false,result:"queryparam not found"},{status : 404})
        }
    }
}


export const DELETE = async(request) =>{
    await connect()
    if (request.method === 'DELETE') {
        const {pdfId } = await request.json()
        if(pdfId){
            const { deletedCount } = await Pdf.deleteOne({_id : new ObjectId(pdfId)})
          //  console.log(deletedCount , "count")

            if(deletedCount > 0){
                return NextResponse.json({result:"Deleted"},{status:200})
            }
        }
    }
}


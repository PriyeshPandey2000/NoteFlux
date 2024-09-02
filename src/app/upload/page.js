"use client"

import React, { useEffect, useState } from "react"
import { UploadButton } from "@uploadthing/react"
import { useSession } from "next-auth/react"

const Upload = () => {

  const[pdfName,setPdfName] = useState("")
  const[pdfUrl,setPdfUrl] = useState("")
  const session = useSession()
  const[userPdfs,setUserPdfs] = useState([])
 // console.log(session?.data?.user?.id)

 //function for uploadpdfs
  const uploadPdf = async () =>{
    if(session?.data?.user?.id != undefined){
      try{
        const uploadUrl = await fetch("/api/upload-pdf",{
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           pdfName : pdfName,
           pdfUrl : pdfUrl,
           userId : session?.data?.user?.id
         }),
        })

        if(uploadUrl.ok){
         const result = await uploadUrl.json()
        // console.log(result)
        }
     }
     catch (error){
       console.log("Error",error)
     }
     finally{
       setPdfName('')
     }
    }
    else{
      alert("Please Login")
    }
    getUserPdfs()
  }


  //function to get a user pdfs
    const getUserPdfs = async () =>{
       if(session?.data?.user?.id){
        try{
          let userId = session?.data?.user?.id
          const fetchPosts = await fetch(`/api/upload-pdf?query=${encodeURIComponent(userId)}`)
          const result = await fetchPosts.json()
         // console.log(result)
          setUserPdfs(result.result)
        }
        catch(err){
         console.log(err)
        }
       }
     }

    useEffect(() => {
     getUserPdfs()
    },[session?.data?.user?.id])


    //Function for deletepdf

    const deletePdf = async(value) =>{
      if(session?.data?.user?.id != undefined){
        try{
          const deletePdfUrl = await fetch("/api/upload-pdf",{
           method: "DELETE",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             pdfId : value._id
           }),
          })

          if(deletePdfUrl.ok){
            const deleteJsonFile = await deletePdfUrl.json()
            console.log(deleteJsonFile)
          }
        }
        catch(err){
          console.log(err)
        }
      }

      getUserPdfs()
    }

  return (
    <div className='col bg-white-500 h-screen '>
      <div className="flex justify-center items-center">
        <input type="text"
         placeholder="Enter Your Pdf Name"
         value={pdfName}
         onChange={(e) => setPdfName(e.target.value)}
         style={{marginLeft : "100px"}}
        />
      </div>

      {/* PDf Upload Button*/}

      <div className="mt-2 flex justify-center items-center">
        <UploadButton
        endpoint="pdfUploader"
        onClientUploadComplete={(res) => {
          // Do something with the response
         // console.log("Files: ", res[0].url);
          setPdfUrl(res[0].url)
          alert("Pdf Added");
        }}
        onUploadError={(error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
       />
      </div>
      {
        pdfName.length > 0 && pdfUrl.length > 0 ?
        <div className="flex justify-center items-center">
          <button onClick={uploadPdf}
           className="col bg-green-500 p-2 round-2"
          >upload</button>
        </div>
        :null
      }

      {/* rendering PDFs */}
      {session?.data?.user?.id 
      ? 
      null
      : 
      <p className="flex justify-center items-center">Please Login</p>}
      <div>
          {
            userPdfs.length > 0 && session?.data?.user?.id != undefined ? 
            <div className="flex justify-center items-center gap-2 flex-col mt-2">
              {
                [...userPdfs].reverse().map((value) => (
                  <p key={value._id} style={{height:"50px",width:"100px",padding:"5px",backgroundColor:"pink"}}>
                    <a href={value.pdfUrl}>{value.pdfName}</a>
                    <div>
                      <button onClick={() =>deletePdf(value)}>
                        Delete
                      </button>
                    </div>
                  </p>
                ))
              }
            </div>
            :
            <div>
              {
                session?.data?.user?.id != undefined ?
                <div className="flex justify-center items-center gap-2 flex-col mt-2">
                  <p style={{height:"50px",width:"100px",padding:"5px",backgroundColor:"pink"}}>No Files</p>
                </div>
                : 
                 null
              }
            </div>
          }
      </div>
    </div>
  )
}

export default Upload
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import Notion from "@auth/core/providers/notion"



import bcrypt from "bcryptjs";
import User from "../../models/User";
import connect from "../../utils/db";

export const NEXT_AUTH={
    providers: [
      Notion({
        clientId: process.env.NOTION_CLIENT_ID,
        clientSecret: process.env.NOTION_CLIENT_SECRET,
        redirectUri:
          "https://note-flux.vercel.app",
      }),
      CredentialsProvider({
        id: "credentials",
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          await connect();
          try {
            const user = await User.findOne({ email: credentials.email });
            if (user) {
              const isPasswordCorrect = await bcrypt.compare(
                credentials.password,
                user.password
              );
              if (isPasswordCorrect) {
                return user;
              }
            }
            return null;
          } catch (err) {
            throw new Error(err);
          }
        },
      }),
      CredentialsProvider({
        id: "credentials",
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          await connect();
          try {
            const user = await User.findOne({ email: credentials.email });
            if (user) {
              const isPasswordCorrect = await bcrypt.compare(
                credentials.password,
                user.password
              );
              if (isPasswordCorrect) {
                return user;
              }
            }
            return null;
          } catch (err) {
            throw new Error(err);
          }
        },
      }),
      GoogleProvider({
        clientId: process.env.GOOGLE_ID ?? "",
        clientSecret: process.env.GOOGLE_SECRET ?? "",
      }),
    ],
    callbacks: {
      async session({ session, token, user }) {
        session.user.id = token.id;
        session.user.username = token.username;
        return session;
      },
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.username = user.username;
        }
        return token;
      },
      async signIn({ user, account }) {
        if (account.provider === "credentials") {
          return true;
        }
        if (account.provider === "google") {
          await connect();
          try {
            const existingUser = await User.findOne({ email: user.email });
            if (!existingUser) {
              const newUser = new User({
                email: user.email,
                username: user.name, // Assuming you want to use the Google name as username
              });
              await newUser.save();
            }
            return true;
          } catch (err) {
            console.log("Error saving user", err);
            return false;
          }
        }
        return true;
      },
    },
  };
import { prisma } from "../../database/prisma";
// import type { User } from "@prisma/client"

export type createUserInput = Readonly<{
    email: string;
    passwordHash: string;
}>

export class UserRepository {

    // find user by email to avoid duplicate
   
 async findByEmail(email: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { email } });
 }   

     // create user
 async create(data: createUserInput): Promise<any> {
     return prisma.user.create({
         data: {
            email: data.email,
            passwordHash: data.passwordHash
        }
    } );
 }   
}